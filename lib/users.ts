import { z } from "zod";
import { prisma } from "@/lib/db";

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

export async function deleteUserByClerkId(clerkId: string) {
  return prisma.user.deleteMany({ where: { clerkId } });
}

export async function countUsers() {
  return prisma.user.count();
}
