import { prisma } from "@/lib/db";

export async function countUsers() {
  return prisma.user.count();
}
