import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { beatKeysOf } from "@/lib/story-templates";
import type { StructureData } from "@/types/story";

/**
 * The project's story structure and the writer's progress through it. Cached until the template, a beat or a link changes,
 * or the outline does (a scene renamed, trashed or deleted). Empty when the project is not the user's.
 */
export async function getStructure(userId: string, projectId: string): Promise<StructureData> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.structure(projectId), cacheTags.manuscript(projectId), cacheTags.project(projectId));
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { storyTemplateId: true } });
  if (!project?.storyTemplateId) return { templateId: null, progress: {} };
  const rows = await prisma.beatProgress.findMany({
    where: { projectId },
    select: { beatKey: true, covered: true, scenes: { where: { trashedAt: null }, select: { id: true, title: true, position: true } } },
  });
  const keys = beatKeysOf(project.storyTemplateId);
  const progress: StructureData["progress"] = {};
  for (const row of rows) {
    if (!keys.has(row.beatKey)) continue;
    progress[row.beatKey] = {
      covered: row.covered,
      scenes: [...row.scenes].sort((a, b) => a.position - b.position).map(({ id, title }) => ({ id, title })),
    };
  }
  return { templateId: project.storyTemplateId, progress };
}

/**
 * Drops the progress of beats the project's template no longer has. Run in the same transaction that changes the template.
 * The link table cleans itself: deleting a BeatProgress row deletes its links.
 */
export async function pruneBeatProgress(tx: Prisma.TransactionClient, projectId: string, templateId: string | null) {
  await tx.beatProgress.deleteMany({ where: { projectId, beatKey: { notIn: [...beatKeysOf(templateId)] } } });
}
