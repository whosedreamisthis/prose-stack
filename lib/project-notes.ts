import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { SceneNoteItem } from "@/types/manuscript";

/** The notes of the whole manuscript (the project itself), oldest first. Empty when the project is not the user's. */
export async function listProjectNotes(userId: string, projectId: string): Promise<SceneNoteItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.projectNotes(projectId), cacheTags.project(projectId));
  const rows = await prisma.projectNote.findMany({
    where: { projectId, trashedAt: null, project: { userId } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, content: true },
  });
  return rows.map((n) => ({ id: n.id, title: n.title ?? "", content: n.content }));
}
