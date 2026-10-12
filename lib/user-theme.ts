import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { ThemeChoice } from "@/lib/theme-config";

/** The user's saved theme, or null when they have not chosen one. Cached until `updateUserTheme` expires it. */
export async function getUserTheme(userId: string): Promise<ThemeChoice | null> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.user(userId));
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { theme: true } });
  return user?.theme ?? null;
}
