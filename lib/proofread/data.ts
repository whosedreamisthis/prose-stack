import "server-only";
import { prisma } from "@/lib/db";
import type { IgnoreEntry } from "@/lib/proofread/types";

/** The project if it belongs to the user, else null. */
export async function ownedProject(userId: string, projectId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
}

/** What Proofread needs to know about a project: its character and place names, and what the writer has chosen to ignore. */
export async function proofreadContext(projectId: string): Promise<{ names: string[]; ignore: IgnoreEntry[] }> {
  const [characters, places, ignores] = await Promise.all([
    prisma.character.findMany({ where: { projectId, trashedAt: null }, select: { name: true } }),
    prisma.place.findMany({ where: { projectId, trashedAt: null }, select: { name: true } }),
    prisma.proofreadIgnore.findMany({ where: { projectId }, select: { kind: true, value: true } }),
  ]);
  return {
    names: [...characters, ...places].map((n) => n.name),
    ignore: ignores,
  };
}
