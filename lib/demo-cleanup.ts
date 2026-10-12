import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { prisma } from "@/lib/db";
import { DEMO_EMAIL_DOMAIN, DEMO_EMAIL_PREFIX } from "@/lib/demo-config";
import { releaseSlotForDemo } from "@/lib/demo-store";
import { deleteStoredFiles, researchFileKeys } from "@/lib/research-storage";

const BATCH = 50;
/** A demo user in Clerk with no database row is only an orphan once creation has had time to finish. */
const ORPHAN_GRACE_MS = 10 * 60 * 1000;
const CLERK_PAGE = 100;
const CLERK_MAX_PAGES = 5;

export interface CleanupResult {
  /** Expired demos fully removed (Clerk user, database rows, IP slot). */
  deleted: number;
  /** Expired demos left in place for the next run to retry. */
  failed: number;
  /** Clerk demo users removed that had no matching database row, or whose metadata said they had expired. */
  orphans: number;
}

/** Deleting something already gone counts as success, so every step can be retried. */
async function deleteClerkUser(clerkId: string) {
  const clerk = await clerkClient();
  try {
    await clerk.users.deleteUser(clerkId);
  } catch (error) {
    if (!(isClerkAPIResponseError(error) && error.status === 404)) throw error;
  }
}

/**
 * The demo's uploaded research files, deleted before its rows (which hold the keys). A failed storage delete is logged
 * and does not stop the cleanup.
 */
async function deleteUserFiles(userId: string) {
  await deleteStoredFiles(await researchFileKeys({ project: { userId } }));
}

/**
 * Removes expired demos. For each: the Clerk user first, then its uploaded files, then the database user (its projects and everything under them
 * cascade), then the IP slot. If the Clerk delete fails the database row stays, so the next run retries; the row is
 * never deleted while the Clerk user may still exist.
 */
async function removeExpired(now: Date, result: CleanupResult) {
  const expired = await prisma.user.findMany({
    where: { isDemo: true, demoExpiresAt: { lt: now } },
    select: { id: true, clerkId: true },
    take: BATCH,
  });

  for (const { id, clerkId } of expired) {
    try {
      await deleteClerkUser(clerkId);
      await deleteUserFiles(id);
      await prisma.user.deleteMany({ where: { id } });
      result.deleted += 1;
    } catch (error) {
      console.error(`Demo cleanup failed for ${clerkId}:`, error);
      result.failed += 1;
      continue;
    }
    try {
      await releaseSlotForDemo(clerkId);
    } catch (error) {
      // The slot frees itself when its 12 hour lifetime ends, so this is only a delay.
      console.error(`Demo IP slot release failed for ${clerkId}:`, error);
    }
  }
}

/**
 * Safety net for a messy Clerk dashboard: demo users that were created but never got a database row (creation failed
 * midway, or the process died), and demo users whose metadata says they have expired.
 */
async function sweepOrphans(now: Date, result: CleanupResult) {
  const clerk = await clerkClient();

  for (let page = 0; page < CLERK_MAX_PAGES; page++) {
    const { data } = await clerk.users.getUserList({
      query: `${DEMO_EMAIL_PREFIX}`,
      limit: CLERK_PAGE,
      offset: page * CLERK_PAGE,
      orderBy: "-created_at",
    });
    if (data.length === 0) return;

    const demoUsers = data.filter(
      (user) => user.publicMetadata?.isDemo === true && user.primaryEmailAddress?.emailAddress.endsWith(`@${DEMO_EMAIL_DOMAIN}`),
    );
    const rows = await prisma.user.findMany({
      where: { clerkId: { in: demoUsers.map((u) => u.id) } },
      select: { clerkId: true },
    });
    const known = new Set(rows.map((r) => r.clerkId));

    for (const user of demoUsers) {
      const expiresAt = Date.parse(String(user.publicMetadata?.demoExpiresAt ?? ""));
      const expired = Number.isFinite(expiresAt) && expiresAt < now.getTime();
      const orphaned = user.createdAt < now.getTime() - ORPHAN_GRACE_MS;
      // A demo with a database row is removed, row and all, by removeExpired; only Clerk-only users are handled here.
      if (known.has(user.id) || (!expired && !orphaned)) continue;
      try {
        await deleteClerkUser(user.id);
        result.orphans += 1;
      } catch (error) {
        console.error(`Demo orphan cleanup failed for ${user.id}:`, error);
      }
    }
    if (data.length < CLERK_PAGE) return;
  }
}

/** The scheduled job: idempotent, safe to run as often as wanted. */
export async function cleanupDemos(now = new Date()): Promise<CleanupResult> {
  const result: CleanupResult = { deleted: 0, failed: 0, orphans: 0 };
  await removeExpired(now, result);
  await sweepOrphans(now, result);
  return result;
}

/**
 * Removes one expired demo right away, for the visitor who just hit its expiry: the Clerk user (which ends its
 * sessions), the database rows and the IP slot. Does nothing for a user that is not an expired demo.
 */
export async function removeExpiredDemo(clerkId: string, now = new Date()): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, isDemo: true, demoExpiresAt: true },
  });
  if (!user || !user.isDemo || !user.demoExpiresAt || user.demoExpiresAt.getTime() > now.getTime()) return false;

  await deleteClerkUser(clerkId);
  await deleteUserFiles(user.id);
  await prisma.user.deleteMany({ where: { id: user.id } });
  try {
    await releaseSlotForDemo(clerkId);
  } catch (error) {
    console.error(`Demo IP slot release failed for ${clerkId}:`, error);
  }
  return true;
}
