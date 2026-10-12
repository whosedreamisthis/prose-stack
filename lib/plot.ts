import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { PlotData } from "@/types/plot";

// Cached until a Server Action in actions/plot.ts changes the plot (see lib/cache-tags.ts). It is also tagged `manuscript`:
// trashing, restoring or deleting a scene hides, shows or removes its points. The user id is an argument, so it is part of the key.

/** The project's plot lines in order and the live points on live scenes. Empty when the project is not the user's. */
export async function getPlot(userId: string, projectId: string): Promise<PlotData> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.plot(projectId), cacheTags.manuscript(projectId), cacheTags.project(projectId));
  const [lines, points] = await Promise.all([
    prisma.plotLine.findMany({
      where: { projectId, project: { userId }, trashedAt: null },
      orderBy: [{ position: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.plotPoint.findMany({
      where: {
        trashedAt: null,
        plotLine: { projectId, project: { userId }, trashedAt: null },
        scene: { trashedAt: null },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, plotLineId: true, sceneId: true, title: true, text: true },
    }),
  ]);
  return { lines, points: points.map((p) => ({ ...p, title: p.title ?? "" })) };
}
