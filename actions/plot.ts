"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { defaultNodeTitle } from "@/lib/manuscript-config";
import { lastChapter } from "@/lib/manuscript-tree";
import {
  CELL_TAKEN,
  DEFAULT_PLOT_LINE_NAME,
  MAX_PLOT_LINES,
  PLOT_POINT_EMPTY,
  createPlotLineSchema,
  createPlotPointSchema,
  plotLineRefSchema,
  plotPointRefSchema,
  renamePlotLineSchema,
  reorderPlotLinesSchema,
  updatePlotPointSchema,
  type CreatePlotPointInput,
  type UpdatePlotPointInput,
} from "@/lib/plot-config";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const LINE_NOT_FOUND = "Plot line not found.";
const SCENE_NOT_FOUND = "Scene not found.";
const POINT_NOT_FOUND = "Plot point not found.";

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/** After a write: expire the cached reads it changed and refresh the open page. The tags must match lib/plot.ts. */
function refresh(projectId: string, ...tags: string[]) {
  for (const tag of [cacheTags.plot(projectId), ...tags]) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Locks the project row so concurrent plot edits for one project run one at a time and the cell checks hold. */
async function lockOwnedProject(tx: Prisma.TransactionClient, userId: string, projectId: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Project" WHERE "id" = ${projectId} AND "userId" = ${userId} FOR UPDATE`;
  return rows.length > 0;
}

/** Puts the project's live plot lines back in 0..n-1 order, keeping their current order. */
async function renumberLines(tx: Prisma.TransactionClient, projectId: string) {
  const lines = await tx.plotLine.findMany({
    where: { projectId, trashedAt: null },
    select: { id: true, position: true },
    orderBy: [{ position: "asc" }, { id: "asc" }],
  });
  for (const [position, line] of lines.entries()) {
    if (line.position !== position) await tx.plotLine.update({ where: { id: line.id }, data: { position } });
  }
}

/** Adds a scene with a default title at the end of the manuscript: in the last chapter, which is created if there is none. */
async function appendScene(tx: Prisma.TransactionClient, projectId: string, id?: string): Promise<string> {
  const nodes = await tx.manuscriptNode.findMany({
    where: { projectId, trashedAt: null },
    select: { id: true, parentId: true, type: true, title: true, position: true },
  });
  const chapter =
    lastChapter(nodes) ??
    (await tx.manuscriptNode.create({
      data: {
        projectId,
        type: "CHAPTER",
        title: defaultNodeTitle("CHAPTER", 0),
        position: nodes.filter((n) => n.parentId === null).length,
      },
      select: { id: true },
    }));
  const siblings = nodes.filter((n) => n.parentId === chapter.id);
  const scene = await tx.manuscriptNode.create({
    data: {
      ...(id && { id }),
      projectId,
      parentId: chapter.id,
      type: "SCENE",
      title: defaultNodeTitle("SCENE", siblings.length),
      position: siblings.length,
    },
    select: { id: true },
  });
  return scene.id;
}

/** Frees a cell for a point: false when a live point is already there. A trashed point in the way is deleted for good. */
async function claimCell(tx: Prisma.TransactionClient, plotLineId: string, sceneId: string, exceptPointId?: string) {
  const there = await tx.plotPoint.findFirst({
    where: { plotLineId, sceneId, ...(exceptPointId && { id: { not: exceptPointId } }) },
    select: { id: true, trashedAt: true },
  });
  if (!there) return true;
  if (!there.trashedAt) return false;
  await tx.plotPoint.delete({ where: { id: there.id } });
  return true;
}

const liveLine = (projectId: string, userId: string, id: string) => ({ id, projectId, project: { userId }, trashedAt: null });
const liveScene = (projectId: string, userId: string, id: string) => ({
  id,
  projectId,
  project: { userId },
  type: "SCENE" as const,
  trashedAt: null,
});

export async function createPlotLine(input: { projectId: string; id?: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createPlotLineSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, id } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return "missing" as const;
      const count = await tx.plotLine.count({ where: { projectId, trashedAt: null } });
      if (count >= MAX_PLOT_LINES) return "full" as const;
      return tx.plotLine.create({
        data: { ...(id && { id }), projectId, name: `${DEFAULT_PLOT_LINE_NAME} ${count + 1}`, position: count },
        select: { id: true },
      });
    });
    if (created === "missing") return { success: false, error: "Project not found." };
    if (created === "full") return { success: false, error: `A project can have up to ${MAX_PLOT_LINES} plot lines.` };

    refresh(projectId);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createPlotLine failed:", error);
    return { success: false, error: "Could not add the plot line. Please try again." };
  }
}

export async function renamePlotLine(input: { projectId: string; plotLineId: string; name: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = renamePlotLineSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, plotLineId, name } = parsed.data;

    const { count } = await prisma.plotLine.updateMany({ where: liveLine(projectId, user.id, plotLineId), data: { name } });
    if (count === 0) return { success: false, error: LINE_NOT_FOUND };

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("renamePlotLine failed:", error);
    return { success: false, error: "Could not rename the plot line. Please try again." };
  }
}

/** Saves a new order of the live plot lines in one transaction. `orderedIds` must be exactly the project's live lines. */
export async function reorderPlotLines(input: { projectId: string; orderedIds: string[] }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = reorderPlotLinesSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, orderedIds } = parsed.data;

    const ok = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return false;
      const lines = await tx.plotLine.findMany({ where: { projectId, trashedAt: null }, select: { id: true } });
      const same =
        lines.length === orderedIds.length && new Set(orderedIds).size === lines.length && lines.every((l) => orderedIds.includes(l.id));
      if (!same) return false;
      for (const [position, id] of orderedIds.entries()) await tx.plotLine.update({ where: { id }, data: { position } });
      return true;
    });
    if (!ok) return { success: false, error: "The plot lines changed. Please try again." };

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("reorderPlotLines failed:", error);
    return { success: false, error: "Could not reorder the plot lines. Please try again." };
  }
}

/** Moves a plot line to the trash. Its points are hidden with it and come back when it is restored. */
export async function trashPlotLine(input: { projectId: string; plotLineId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = plotLineRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, plotLineId } = parsed.data;

    const trashed = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return false;
      const { count } = await tx.plotLine.updateMany({
        where: { id: plotLineId, projectId, trashedAt: null },
        data: { trashedAt: new Date() },
      });
      if (count === 0) return false;
      await renumberLines(tx, projectId);
      return true;
    });
    if (!trashed) return { success: false, error: LINE_NOT_FOUND };

    refresh(projectId, cacheTags.trash(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("trashPlotLine failed:", error);
    return { success: false, error: "Could not move the plot line to the trash. Please try again." };
  }
}

/** Adds a plot point to a scene, or (with `newSceneId`) to a scene added at the end of the manuscript at the same time. */
export async function createPlotPoint(input: CreatePlotPointInput): Promise<ActionResult<{ id: string; sceneId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createPlotPointSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, plotLineId, sceneId, newSceneId, id, title, text } = parsed.data;

    const result = await prisma.$transaction(async (tx): Promise<{ error: string } | { id: string; sceneId: string; addedScene: boolean }> => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return { error: "Project not found." };
      if (!(await tx.plotLine.findFirst({ where: liveLine(projectId, user.id, plotLineId), select: { id: true } }))) {
        return { error: LINE_NOT_FOUND };
      }
      if (sceneId) {
        if (!(await tx.manuscriptNode.findFirst({ where: liveScene(projectId, user.id, sceneId), select: { id: true } }))) {
          return { error: SCENE_NOT_FOUND };
        }
        if (!(await claimCell(tx, plotLineId, sceneId))) return { error: CELL_TAKEN };
      }
      const target = sceneId ?? (await appendScene(tx, projectId, newSceneId));
      const created = await tx.plotPoint.create({
        data: { ...(id && { id }), plotLineId, sceneId: target, ...(title && { title }), text },
        select: { id: true },
      });
      return { id: created.id, sceneId: target, addedScene: !sceneId };
    });
    if ("error" in result) return { success: false, error: result.error };

    refresh(projectId, ...(result.addedScene ? [cacheTags.manuscript(projectId)] : []));
    return { success: true, data: { id: result.id, sceneId: result.sceneId } };
  } catch (error) {
    console.error("createPlotPoint failed:", error);
    return { success: false, error: "Could not add the plot point. Please try again." };
  }
}

/** Edits a plot point's text, or moves it to another plot line and/or scene (the target cell must be free). */
export async function updatePlotPoint(input: UpdatePlotPointInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = updatePlotPointSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, pointId, title, text, plotLineId, sceneId } = parsed.data;

    const error = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return POINT_NOT_FOUND;
      const point = await tx.plotPoint.findFirst({
        where: {
          id: pointId,
          trashedAt: null,
          plotLine: { projectId, trashedAt: null },
          scene: { projectId, trashedAt: null },
        },
        select: { plotLineId: true, sceneId: true, title: true, text: true },
      });
      if (!point) return POINT_NOT_FOUND;

      const toLine = plotLineId ?? point.plotLineId;
      const toScene = sceneId ?? point.sceneId;
      if (toLine !== point.plotLineId || toScene !== point.sceneId) {
        if (!(await tx.plotLine.findFirst({ where: liveLine(projectId, user.id, toLine), select: { id: true } }))) return LINE_NOT_FOUND;
        if (!(await tx.manuscriptNode.findFirst({ where: liveScene(projectId, user.id, toScene), select: { id: true } }))) {
          return SCENE_NOT_FOUND;
        }
        if (!(await claimCell(tx, toLine, toScene, pointId))) return CELL_TAKEN;
      }
      // What is left must still have a title or text.
      if (!(title ?? point.title) && !(text ?? point.text)) return PLOT_POINT_EMPTY;

      await tx.plotPoint.update({
        where: { id: pointId },
        data: {
          ...(title !== undefined && { title: title || null }),
          ...(text !== undefined && { text }),
          plotLineId: toLine,
          sceneId: toScene,
        },
      });
      return null;
    });
    if (error) return { success: false, error };

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updatePlotPoint failed:", error);
    return { success: false, error: "Could not save the plot point. Please try again." };
  }
}

export async function trashPlotPoint(input: { projectId: string; pointId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = plotPointRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, pointId } = parsed.data;

    const { count } = await prisma.plotPoint.updateMany({
      where: { id: pointId, trashedAt: null, plotLine: { projectId, project: { userId: user.id } } },
      data: { trashedAt: new Date() },
    });
    if (count === 0) return { success: false, error: POINT_NOT_FOUND };

    refresh(projectId, cacheTags.trash(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("trashPlotPoint failed:", error);
    return { success: false, error: "Could not move the plot point to the trash. Please try again." };
  }
}

/** Adds a scene with a default title at the end of the manuscript, for the empty plot grid's "Add scene". */
export async function addScene(input: { projectId: string; id?: string }): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createPlotLineSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, id } = parsed.data;

    const sceneId = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return null;
      return appendScene(tx, projectId, id);
    });
    if (!sceneId) return { success: false, error: "Project not found." };

    refresh(projectId, cacheTags.manuscript(projectId));
    return { success: true, data: { id: sceneId } };
  } catch (error) {
    console.error("addScene failed:", error);
    return { success: false, error: "Could not add the scene. Please try again." };
  }
}
