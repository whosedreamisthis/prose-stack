"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import {
  canParent,
  createNodeSchema,
  defaultNodeTitle,
  moveNodeSchema,
  renameNodeSchema,
  saveSceneSchema,
  saveSummarySchema,
  trashNodeSchema,
  type CreateNodeInput,
  type MoveNodeInput,
} from "@/lib/manuscript-config";
import { todayUtc } from "@/lib/manuscript";
import { countDocWords, type DocNode } from "@/lib/manuscript-text";
import { planMove, subtreeIds } from "@/lib/manuscript-tree";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Item not found.";
const BAD_PLACEMENT = "That item can't go there.";
const MAX_CONTENT_BYTES = 2_000_000;

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/** After a tree change: expire the cached outline (plus any extra tags), and refresh the open page. Tags must match lib/manuscript.ts. */
function refreshTree(projectId: string, ...extraTags: string[]) {
  for (const tag of [cacheTags.manuscript(projectId), ...extraTags]) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Locks the project row so concurrent tree edits for one project run one at a time and keep positions consistent. */
async function lockOwnedProject(tx: Prisma.TransactionClient, userId: string, projectId: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Project" WHERE "id" = ${projectId} AND "userId" = ${userId} FOR UPDATE`;
  return rows.length > 0;
}

export async function createNode(input: CreateNodeInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createNodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, parentId, type, id } = parsed.data;

    const created = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return "missing" as const;
      const parent = parentId
        ? await tx.manuscriptNode.findFirst({ where: { id: parentId, projectId, trashedAt: null }, select: { type: true } })
        : null;
      if (parentId && !parent) return "missing" as const;
      if (!canParent(parent?.type ?? null, type)) return "hierarchy" as const;

      const siblings = await tx.manuscriptNode.findMany({ where: { projectId, parentId, trashedAt: null }, select: { type: true } });
      const sameType = siblings.filter((s) => s.type === type).length;
      return tx.manuscriptNode.create({
        data: { ...(id && { id }), projectId, parentId, type, title: defaultNodeTitle(type, sameType), position: siblings.length },
        select: { id: true },
      });
    });
    if (created === "missing") return { success: false, error: NOT_FOUND };
    if (created === "hierarchy") return { success: false, error: BAD_PLACEMENT };

    refreshTree(projectId);
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createNode failed:", error);
    return { success: false, error: "Could not add the item. Please try again." };
  }
}

export async function renameNode(input: { projectId: string; nodeId: string; title: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = renameNodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, nodeId, title } = parsed.data;

    const { count } = await prisma.manuscriptNode.updateMany({
      where: { id: nodeId, projectId, trashedAt: null, project: { userId: user.id } },
      data: { title },
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    // A scene's title is part of its cached read too.
    refreshTree(projectId, cacheTags.scene(nodeId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("renameNode failed:", error);
    return { success: false, error: "Could not rename the item. Please try again." };
  }
}

export async function moveNode(input: MoveNodeInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = moveNodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, nodeId, parentId, index } = parsed.data;

    const failure = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return NOT_FOUND;
      const nodes = await tx.manuscriptNode.findMany({
        where: { projectId, trashedAt: null },
        select: { id: true, parentId: true, type: true, title: true, position: true },
      });
      const plan = planMove(nodes, nodeId, parentId, index);
      if ("error" in plan) return plan.error;
      for (const update of plan.updates) {
        await tx.manuscriptNode.update({ where: { id: update.id }, data: { parentId: update.parentId, position: update.position } });
      }
      return null;
    });
    if (failure) return { success: false, error: failure };

    refreshTree(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("moveNode failed:", error);
    return { success: false, error: "Could not move the item. Please try again." };
  }
}

/**
 * Moves a node and everything under it to the trash (one `trashedAt` for the whole subtree, so a restore can bring the
 * group back together). The siblings left behind are renumbered so positions stay 0..n-1 for the next add.
 */
export async function trashNode(input: { projectId: string; nodeId: string }): Promise<ActionResult<{ trashedIds: string[] }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = trashNodeSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, nodeId } = parsed.data;

    const trashedIds = await prisma.$transaction(async (tx) => {
      if (!(await lockOwnedProject(tx, user.id, projectId))) return null;
      const nodes = await tx.manuscriptNode.findMany({
        where: { projectId, trashedAt: null },
        select: { id: true, parentId: true, position: true },
        orderBy: { position: "asc" },
      });
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return null;

      const ids = subtreeIds(nodes, nodeId);
      await tx.manuscriptNode.updateMany({ where: { id: { in: ids }, projectId }, data: { trashedAt: new Date() } });
      const siblings = nodes.filter((n) => n.parentId === target.parentId && n.id !== nodeId);
      for (const [position, sibling] of siblings.entries()) {
        if (sibling.position !== position) await tx.manuscriptNode.update({ where: { id: sibling.id }, data: { position } });
      }
      return ids;
    });
    if (!trashedIds) return { success: false, error: NOT_FOUND };

    // The scenes' cached reads and the word totals no longer include what was trashed.
    refreshTree(projectId, cacheTags.stats(projectId), cacheTags.trash(projectId), ...trashedIds.map((id) => cacheTags.scene(id)));
    return { success: true, data: { trashedIds } };
  } catch (error) {
    console.error("trashNode failed:", error);
    return { success: false, error: "Could not move the item to the trash. Please try again." };
  }
}

/** Saves one scene. The word count is computed here from the content, never taken from the client. */
export async function saveScene(input: {
  projectId: string;
  nodeId: string;
  content: DocNode;
}): Promise<ActionResult<{ updatedAt: number }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = saveSceneSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, nodeId } = parsed.data;
    const content = parsed.data.content as DocNode;
    if (JSON.stringify(content).length > MAX_CONTENT_BYTES) return { success: false, error: "This scene is too large to save." };

    const wordCount = countDocWords(content);
    const updatedAt = await prisma.$transaction(async (tx) => {
      const scene = await tx.manuscriptNode.findFirst({
        where: { id: nodeId, projectId, type: "SCENE", trashedAt: null, project: { userId: user.id } },
        select: { id: true },
      });
      if (!scene) return null;

      const total = await tx.manuscriptNode.aggregate({ where: { projectId, type: "SCENE", trashedAt: null }, _sum: { wordCount: true } });
      await tx.dailyWordCount.upsert({
        where: { projectId_date: { projectId, date: todayUtc() } },
        create: { projectId, date: todayUtc(), startWords: total._sum.wordCount ?? 0 },
        update: {},
      });
      const saved = await tx.manuscriptNode.update({
        where: { id: nodeId },
        data: { content: content as Prisma.InputJsonValue, wordCount },
        select: { updatedAt: true },
      });
      await tx.project.update({ where: { id: projectId }, data: { updatedAt: new Date() } });
      return saved.updatedAt.getTime();
    });
    if (updatedAt === null) return { success: false, error: NOT_FOUND };

    // Not the outline: it never shows a scene's word count, so autosave leaves it cached.
    updateTag(cacheTags.scene(nodeId));
    updateTag(cacheTags.stats(projectId));
    // The save moved the project to the top of the list and changed its "Edited" date.
    updateTag(cacheTags.projects(user.id));

    return { success: true, data: { updatedAt } };
  } catch (error) {
    console.error("saveScene failed:", error);
    return { success: false, error: "Could not save. Retrying shortly." };
  }
}

export async function saveSceneSummary(input: { projectId: string; nodeId: string; summary: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = saveSummarySchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, nodeId, summary } = parsed.data;

    const { count } = await prisma.manuscriptNode.updateMany({
      where: { id: nodeId, projectId, type: "SCENE", trashedAt: null, project: { userId: user.id } },
      data: { summary: summary.trim() || null },
    });
    if (count === 0) return { success: false, error: NOT_FOUND };
    updateTag(cacheTags.scene(nodeId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("saveSceneSummary failed:", error);
    return { success: false, error: "Could not save the summary. Please try again." };
  }
}
