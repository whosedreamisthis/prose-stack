import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { SceneNoteItem } from "@/types/manuscript";

/** Notes of one manuscript item (a scene, and also a chapter or part), oldest first. Empty when it is not the user's or is trashed. */
export async function listSceneNotes(userId: string, projectId: string, sceneId: string): Promise<SceneNoteItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.sceneNotes(sceneId), cacheTags.project(projectId));
  const rows = await prisma.sceneNote.findMany({
    where: { sceneId, trashedAt: null, scene: { projectId, project: { userId }, trashedAt: null } },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, content: true },
  });
  return rows.map((n) => ({ id: n.id, title: n.title ?? "", content: n.content }));
}
