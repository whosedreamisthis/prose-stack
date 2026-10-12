import "server-only";
import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import {
  DEMO_EMAIL_DOMAIN,
  DEMO_EMAIL_PREFIX,
  DEMO_LIFETIME_MS,
  DEMO_UNAVAILABLE_MESSAGE,
  PENDING_POLL_MS,
  PENDING_PREFIX,
  PENDING_WAIT_MS,
  SIGN_IN_TOKEN_SECONDS,
} from "@/lib/demo-config";
import { readDemoCookie } from "@/lib/demo-cookie";
import { hashIp } from "@/lib/demo-ip";
import { seedDemoProject } from "@/lib/demo-seed";
import { DemoStoreError, bindIpSlot, claimIpSlot, isPending, readIpSlot, releaseIpSlot } from "@/lib/demo-store";

export type DemoResult =
  { ok: true; ticket: string; clerkId: string; expiresAt: Date; created: boolean } | { ok: false; status: 500 | 503; message: string };

const unavailable: DemoResult = { ok: false, status: 503, message: DEMO_UNAVAILABLE_MESSAGE };
const failed: DemoResult = { ok: false, status: 500, message: "Could not start the demo. Please try again." };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The demo's expiry when this Clerk id is a demo that is still live, else null. */
async function liveDemoExpiry(clerkId: string): Promise<Date | null> {
  const user = await prisma.user.findUnique({ where: { clerkId }, select: { isDemo: true, demoExpiresAt: true } });
  if (!user?.isDemo || !user.demoExpiresAt || user.demoExpiresAt.getTime() <= Date.now()) return null;
  return user.demoExpiresAt;
}

/** A one-use token the browser redeems to sign in as the demo user, without any credentials. */
async function mintTicket(clerkId: string) {
  const clerk = await clerkClient();
  const token = await clerk.signInTokens.createSignInToken({ userId: clerkId, expiresInSeconds: SIGN_IN_TOKEN_SECONDS });
  return token.token;
}

async function resume(clerkId: string): Promise<DemoResult | null> {
  const expiresAt = await liveDemoExpiry(clerkId);
  if (!expiresAt) return null;
  return { ok: true, ticket: await mintTicket(clerkId), clerkId, expiresAt, created: false };
}

/**
 * Follows the IP's slot: signs into the demo it names, waits briefly for one that another request is still creating, and
 * frees a slot that names a demo that no longer exists. Null when the slot is empty.
 */
async function resumeFromSlot(ipHash: string): Promise<DemoResult | null> {
  const deadline = Date.now() + PENDING_WAIT_MS;
  while (true) {
    const value = await readIpSlot(ipHash);
    if (value === null) return null;

    if (isPending(value)) {
      if (Date.now() >= deadline) return unavailable;
      await sleep(PENDING_POLL_MS);
      continue;
    }

    const resumed = await resume(value);
    if (resumed) return resumed;
    await releaseIpSlot(ipHash, value); // a stale entry: the demo is gone, so the IP may start a new one
    return null;
  }
}

interface DemoAccount {
  clerkId: string;
  email: string;
  expiresAt: Date;
}

/** Creates the Clerk user. A demo has no real credentials: it is only ever entered through a sign-in token. */
async function createClerkDemoUser(): Promise<DemoAccount> {
  const clerk = await clerkClient();
  const expiresAt = new Date(Date.now() + DEMO_LIFETIME_MS);
  const email = `${DEMO_EMAIL_PREFIX}${randomUUID()}@${DEMO_EMAIL_DOMAIN}`;

  const clerkUser = await clerk.users.createUser({
    emailAddress: [email],
    firstName: "Demo",
    lastName: "Writer",
    skipPasswordRequirement: true,
    publicMetadata: { isDemo: true, demoExpiresAt: expiresAt.toISOString() },
  });

  return { clerkId: clerkUser.id, email, expiresAt };
}

/** The database row and its seeded project, in one transaction. */
async function saveDemoUser({ clerkId, email, expiresAt }: DemoAccount) {
  // Upsert, because the Clerk webhook for this same user may already have created the row.
  await prisma.$transaction(
    async (tx) => {
      const user = await tx.user.upsert({
        where: { clerkId },
        create: { clerkId, email, name: "Demo Writer", isDemo: true, demoExpiresAt: expiresAt },
        update: { isDemo: true, demoExpiresAt: expiresAt },
        select: { id: true },
      });
      await seedDemoProject(tx, user.id);
    },
    { timeout: 20_000 },
  );
}

/** Undoes a half-made demo. Each step is tried on its own, so one failing never stops the others. */
async function rollback(clerkId: string | undefined, ipHash: string, marker: string) {
  const steps: (() => Promise<unknown>)[] = [];
  if (clerkId) {
    steps.push(async () => (await clerkClient()).users.deleteUser(clerkId));
    steps.push(() => prisma.user.deleteMany({ where: { clerkId } }));
    steps.push(() => releaseIpSlot(ipHash, clerkId));
  }
  steps.push(() => releaseIpSlot(ipHash, marker));
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      console.error("Demo rollback step failed:", error);
    }
  }
}

async function createDemo(ipHash: string): Promise<DemoResult> {
  const marker = `${PENDING_PREFIX}${randomUUID()}`;

  let claimed: boolean;
  try {
    claimed = await claimIpSlot(ipHash, marker);
  } catch (error) {
    if (error instanceof DemoStoreError) return unavailable;
    throw error;
  }

  if (!claimed) {
    // Another request from this IP got there first: sign into its demo instead of making a second one.
    try {
      return (await resumeFromSlot(ipHash)) ?? unavailable;
    } catch (error) {
      if (error instanceof DemoStoreError) return unavailable;
      throw error;
    }
  }

  let clerkId: string | undefined;
  try {
    const account = await createClerkDemoUser();
    clerkId = account.clerkId;
    await saveDemoUser(account);
    await bindIpSlot(ipHash, marker, account.clerkId);
    const ticket = await mintTicket(account.clerkId);
    return { ok: true, ticket, clerkId: account.clerkId, expiresAt: account.expiresAt, created: true };
  } catch (error) {
    console.error("startDemo failed:", error);
    await rollback(clerkId, ipHash, marker);
    return error instanceof DemoStoreError ? unavailable : failed;
  }
}

interface StartDemoInput {
  /** The caller's IP, or null when the proxy didn't supply one. */
  ip: string | null;
  /** The raw resume cookie, if the browser sent one. */
  cookieValue: string | undefined;
  /** Keys the IP hash and the cookie signature. */
  secret: string;
}

/**
 * Creates the caller's demo, or signs them back into the one they have: first through their IP's slot, then through the
 * resume cookie (for an IP that changed). Without Redis only the cookie works, and a new demo is refused.
 */
export async function startDemo({ ip, cookieValue, secret }: StartDemoInput): Promise<DemoResult> {
  const ipHash = ip ? hashIp(ip, secret) : null;
  let storeDown = false;

  if (ipHash) {
    try {
      const fromSlot = await resumeFromSlot(ipHash);
      if (fromSlot) return fromSlot;
    } catch (error) {
      if (!(error instanceof DemoStoreError)) throw error;
      storeDown = true;
    }
  }

  const cookieClerkId = readDemoCookie(cookieValue, secret);
  if (cookieClerkId) {
    const fromCookie = await resume(cookieClerkId);
    if (fromCookie) return fromCookie;
  }

  if (!ipHash || storeDown) return unavailable;
  return createDemo(ipHash);
}
