import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { formatName, upsertUser } from "@/lib/users";

/**
 * The signed-in user's database row, or null when signed out.
 * Creates the row on first request if the Clerk webhook has not arrived yet.
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  return upsertUser({
    clerkId: clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    name: formatName(clerkUser.firstName, clerkUser.lastName),
  });
}
