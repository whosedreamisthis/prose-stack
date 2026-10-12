import { z } from "zod";
import { prisma } from "@/lib/db";
import { deleteStoredFiles, researchFileKeys } from "@/lib/research-storage";

const clerkUserSchema = z.object({
  clerkId: z.string().min(1),
  email: z.string().email().nullable(),
  name: z.string().nullable(),
});

export type ClerkUserInput = z.input<typeof clerkUserSchema>;

export function formatName(first?: string | null, last?: string | null) {
  return [first, last].filter(Boolean).join(" ") || null;
}

// Idempotent: Clerk retries webhooks, and the first-request fallback can race the webhook.
export async function upsertUser(input: ClerkUserInput) {
  const data = clerkUserSchema.parse(input);
  return prisma.user.upsert({
    where: { clerkId: data.clerkId },
    create: data,
    update: { email: data.email, name: data.name },
  });
}

/** Deletes the user (everything they own cascades) and their stored research files. */
export async function deleteUserByClerkId(clerkId: string) {
  const fileKeys = await researchFileKeys({ project: { user: { clerkId } } });
  const result = await prisma.user.deleteMany({ where: { clerkId } });
  await deleteStoredFiles(fileKeys);
  return result;
}

export async function countUsers() {
  return prisma.user.count();
}
