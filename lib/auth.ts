import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { formatName, upsertUser } from "@/lib/users";

/** A demo whose time is up. Checked on every request, so an expired demo is blocked before the cleanup job removes it. */
export function isExpiredDemo(user: { isDemo: boolean; demoExpiresAt: Date | null }, now = new Date()) {
  return user.isDemo && user.demoExpiresAt !== null && user.demoExpiresAt.getTime() <= now.getTime();
}

/**
 * The signed-in user's database row, or null when signed out. Memoized per request.
 * Creates the row on first request if the Clerk webhook has not arrived yet.
 *
 * A demo whose time is up is blocked here, even if the cleanup job has not deleted it yet: the visitor is sent to
 * /api/demo/expired, which deletes the demo and signs them out.
 */
export const getCurrentUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) {
    if (isExpiredDemo(existing)) redirect("/api/demo/expired");
    return existing;
  }

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  return upsertUser({
    clerkId: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    name: formatName(clerkUser.firstName, clerkUser.lastName),
  });
});
