import "server-only";
import { Redis } from "@upstash/redis";
import { DEMO_LIFETIME_SECONDS, PENDING_PREFIX, ipKey, userKey } from "@/lib/demo-config";

/** Redis is unreachable or errored. Callers fail closed on this: no demo is created unchecked. */
export class DemoStoreError extends Error {
  constructor(cause: unknown) {
    super("Demo store unavailable", { cause });
    this.name = "DemoStoreError";
  }
}

let client: Redis | null = null;
function redis() {
  client ??= Redis.fromEnv();
  return client;
}

async function guard<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new DemoStoreError(error);
  }
}

export const isPending = (value: string) => value.startsWith(PENDING_PREFIX);

/** What the IP slot holds: a demo's Clerk id, a `pending:` marker while one is being created, or null when free. */
export function readIpSlot(ipHash: string): Promise<string | null> {
  return guard(async () => (await redis().get<string>(ipKey(ipHash))) ?? null);
}

/** Atomically takes a free slot (SET NX EX), holding it for the demo's lifetime. False when someone else holds it. */
export function claimIpSlot(ipHash: string, marker: string): Promise<boolean> {
  return guard(async () => (await redis().set(ipKey(ipHash), marker, { nx: true, ex: DEMO_LIFETIME_SECONDS })) === "OK");
}

/** Replaces our marker with the demo's Clerk id, keeping the slot's remaining lifetime, and records the reverse lookup. */
export function bindIpSlot(ipHash: string, marker: string, clerkId: string): Promise<void> {
  return guard(async () => {
    const current = await redis().get<string>(ipKey(ipHash));
    // Only if the slot is still ours: it may have been freed (and re-claimed) while we were creating the demo.
    if (current !== marker) throw new Error("IP slot lost before the demo was ready");
    await redis().set(ipKey(ipHash), clerkId, { xx: true, keepTtl: true });
    await redis().set(userKey(clerkId), ipHash, { ex: DEMO_LIFETIME_SECONDS });
  });
}

/** Frees the slot, but only while it still holds `expected` (our marker or the demo's id), never someone else's. */
export function releaseIpSlot(ipHash: string, expected: string): Promise<void> {
  return guard(async () => {
    if ((await redis().get<string>(ipKey(ipHash))) === expected) await redis().del(ipKey(ipHash));
  });
}

/** Frees the IP slot of a demo being deleted (found through the reverse lookup) and drops the lookup itself. */
export function releaseSlotForDemo(clerkId: string): Promise<void> {
  return guard(async () => {
    const ipHash = await redis().get<string>(userKey(clerkId));
    if (ipHash && (await redis().get<string>(ipKey(ipHash))) === clerkId) await redis().del(ipKey(ipHash));
    await redis().del(userKey(clerkId));
  });
}
