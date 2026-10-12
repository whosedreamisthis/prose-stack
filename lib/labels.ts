import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { LabelWithUsage } from "@/types/labels";

// Cached until a Server Action in actions/labels.ts changes the labels, or something that carries one is labelled,
// unlabelled, trashed or deleted (see lib/cache-tags.ts). The user id is an argument, so it is part of the key.

/** The project's labels, alphabetical, with how many live items carry each. Empty when the project is not the user's. */
export async function listLabels(userId: string, projectId: string): Promise<LabelWithUsage[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.labels(projectId), cacheTags.manuscript(projectId), cacheTags.plot(projectId), cacheTags.project(projectId));
  const rows = await prisma.label.findMany({
    where: { projectId, project: { userId } },
    select: {
      id: true,
      name: true,
      color: true,
      nodes: { where: { trashedAt: null }, select: { id: true } },
      plotPoints: { where: { trashedAt: null, scene: { trashedAt: null }, plotLine: { trashedAt: null } }, select: { id: true } },
    },
  });
  return rows
    .map((l) => ({ id: l.id, name: l.name, color: l.color, sceneCount: l.nodes.length, plotPointCount: l.plotPoints.length }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
