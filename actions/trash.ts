"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { subtreeIds } from "@/lib/manuscript-tree";
import {
  deleteResearchFolder,
  restoreResearchFolder,
  restoreResearchItem,
  trashArchivedResearch,
} from "@/lib/research-hidden";
import { archiveRefSchema, trashRefSchema, type ArchiveRef, type TrashRef } from "@/lib/trash-config";
import { trashGroupIds, trashedAncestorIds } from "@/lib/trash-tree";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "That item is not in the trash.";
/** Sorts a restored node after its live siblings until the siblings are renumbered. */
const END = 1_000_000;

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

function refresh(projectId: string, tags: string[]) {
  for (const tag of tags) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Locks the project row so concurrent tree edits for one project run one at a time and keep positions consistent. */
async function lockOwnedProject(tx: Prisma.TransactionClient, userId: string, projectId: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Project" WHERE "id" = ${projectId} AND "userId" = ${userId} FOR UPDATE`;
  return rows.length > 0;
}

/** Puts the live children of each parent back in 0..n-1 order, keeping their current order. */
async function renumber(tx: Prisma.TransactionClient, projectId: string, parentIds: (string | null)[]) {
  for (const parentId of new Set(parentIds)) {
    const children = await tx.manuscriptNode.findMany({
      where: { projectId, parentId, trashedAt: null },
      select: { id: true, position: true },
      orderBy: [{ position: "asc" }, { id: "asc" }],
    });
    for (const [position, child] of children.entries()) {
      if (child.position !== position) await tx.manuscriptNode.update({ where: { id: child.id }, data: { position } });
    }
  }
}

/** Restores a trashed node with what was trashed with it, and any trashed ancestors it needs, at the end of their siblings. */
async function restoreNode(userId: string, projectId: string, id: string): Promise<string[] | null> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return null;
    const nodes = await tx.manuscriptNode.findMany({ where: { projectId }, select: { id: true, parentId: true, trashedAt: true } });
    const group = trashGroupIds(nodes, id);
    if (group.length === 0) return null;
    const ancestors = trashedAncestorIds(nodes, id);

    const chain = [id, ...ancestors];
    await tx.manuscriptNode.updateMany({ where: { id: { in: group }, projectId }, data: { trashedAt: null } });
    if (ancestors.length > 0)
      await tx.manuscriptNode.updateMany({ where: { id: { in: ancestors }, projectId }, data: { trashedAt: null } });
    await tx.manuscriptNode.updateMany({ where: { id: { in: chain }, projectId }, data: { position: END } });

    const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
    await renumber(tx, projectId, [...chain.map((n) => parentOf.get(n) ?? null), ...chain, ...group]);
    return [...ancestors, ...group];
  });
}

async function deleteNode(userId: string, projectId: string, id: string): Promise<string[] | null> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return null;
    const nodes = await tx.manuscriptNode.findMany({ where: { projectId }, select: { id: true, parentId: true, trashedAt: true } });
    if (!nodes.find((n) => n.id === id)?.trashedAt) return null;
    const ids = subtreeIds(nodes, id);
    // Everything under a trashed node is trashed too, so deleting the node and letting the cascade follow removes only trash.
    await tx.manuscriptNode.deleteMany({ where: { id, projectId } });
    return ids;
  });
}

/** Restores a trashed plot line at the end of the live ones; the points hidden with it come back too. */
async function restorePlotLine(userId: string, projectId: string, id: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return false;
    const count = await tx.plotLine.count({ where: { projectId, trashedAt: null } });
    const { count: restored } = await tx.plotLine.updateMany({
      where: { id, projectId, trashedAt: { not: null } },
      data: { trashedAt: null, position: count },
    });
    return restored > 0;
  });
}

export async function restoreItem(input: TrashRef): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = trashRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, kind, id } = parsed.data;
    const owner = { projectId, project: { userId: user.id } };
    const hidden = { not: null };

    let tags: string[] = [];
    if (kind === "node") {
      const restored = await restoreNode(user.id, projectId, id);
      if (!restored) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.manuscript(projectId), cacheTags.stats(projectId), ...restored.map((n) => cacheTags.scene(n))];
    } else if (kind === "character") {
      const { count } = await prisma.character.updateMany({ where: { id, ...owner, trashedAt: hidden }, data: { trashedAt: null } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.characters(projectId), cacheTags.character(id), cacheTags.characterNotes(id)];
    } else if (kind === "place") {
      const { count } = await prisma.place.updateMany({ where: { id, ...owner, trashedAt: hidden }, data: { trashedAt: null } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.places(projectId), cacheTags.place(id), cacheTags.placeNotes(id)];
    } else if (kind === "characterNote") {
      const note = await prisma.characterNote.findFirst({
        where: { id, trashedAt: hidden, character: { ...owner, trashedAt: null, archivedAt: null } },
        select: { characterId: true },
      });
      if (!note) return { success: false, error: NOT_FOUND };
      await prisma.characterNote.updateMany({ where: { id, characterId: note.characterId }, data: { trashedAt: null } });
      tags = [cacheTags.characterNotes(note.characterId)];
    } else if (kind === "placeNote") {
      const note = await prisma.placeNote.findFirst({
        where: { id, trashedAt: hidden, place: { ...owner, trashedAt: null, archivedAt: null } },
        select: { placeId: true },
      });
      if (!note) return { success: false, error: NOT_FOUND };
      await prisma.placeNote.updateMany({ where: { id, placeId: note.placeId }, data: { trashedAt: null } });
      tags = [cacheTags.placeNotes(note.placeId)];
    } else if (kind === "sceneNote") {
      const note = await prisma.sceneNote.findFirst({
        where: { id, trashedAt: hidden, scene: { ...owner, trashedAt: null } },
        select: { sceneId: true },
      });
      if (!note) return { success: false, error: NOT_FOUND };
      await prisma.sceneNote.updateMany({ where: { id, sceneId: note.sceneId }, data: { trashedAt: null } });
      tags = [cacheTags.sceneNotes(note.sceneId)];
    } else if (kind === "projectNote") {
      const { count } = await prisma.projectNote.updateMany({ where: { id, ...owner, trashedAt: hidden }, data: { trashedAt: null } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.projectNotes(projectId)];
    } else if (kind === "researchFolder" || kind === "researchItem") {
      const restore = kind === "researchFolder" ? restoreResearchFolder : restoreResearchItem;
      if (!(await restore(user.id, projectId, id, "trashedAt"))) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.research(projectId), cacheTags.researchItem(id)];
    } else if (kind === "plotLine") {
      if (!(await restorePlotLine(user.id, projectId, id))) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.plot(projectId)];
    } else if (kind === "plotPoint") {
      const point = await prisma.plotPoint.findFirst({
        where: { id, trashedAt: hidden, plotLine: { ...owner, trashedAt: null }, scene: { trashedAt: null } },
        select: { id: true },
      });
      if (!point) return { success: false, error: NOT_FOUND };
      await prisma.plotPoint.updateMany({ where: { id }, data: { trashedAt: null } });
      tags = [cacheTags.plot(projectId)];
    }

    refresh(projectId, [...tags, cacheTags.trash(projectId)]);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("restoreItem failed:", error);
    return { success: false, error: "Could not restore the item. Please try again." };
  }
}

export async function deleteItemPermanently(input: TrashRef): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = trashRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, kind, id } = parsed.data;
    const owner = { projectId, project: { userId: user.id } };
    const hidden = { not: null };

    let tags: string[] = [];
    if (kind === "node") {
      const removed = await deleteNode(user.id, projectId, id);
      if (!removed) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.manuscript(projectId), cacheTags.stats(projectId), ...removed.map((n) => cacheTags.scene(n))];
    } else if (kind === "character") {
      const { count } = await prisma.character.deleteMany({ where: { id, ...owner, trashedAt: hidden } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      // Places listed this character as related; the join rows go with it.
      tags = [cacheTags.characters(projectId), cacheTags.character(id), cacheTags.characterNotes(id)];
    } else if (kind === "place") {
      const { count } = await prisma.place.deleteMany({ where: { id, ...owner, trashedAt: hidden } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.places(projectId), cacheTags.place(id), cacheTags.placeNotes(id)];
    } else if (kind === "characterNote") {
      const note = await prisma.characterNote.findFirst({
        where: { id, trashedAt: hidden, character: { ...owner, trashedAt: null, archivedAt: null } },
        select: { characterId: true },
      });
      if (!note) return { success: false, error: NOT_FOUND };
      await prisma.characterNote.deleteMany({ where: { id, characterId: note.characterId } });
      tags = [cacheTags.characterNotes(note.characterId)];
    } else if (kind === "placeNote") {
      const note = await prisma.placeNote.findFirst({
        where: { id, trashedAt: hidden, place: { ...owner, trashedAt: null, archivedAt: null } },
        select: { placeId: true },
      });
      if (!note) return { success: false, error: NOT_FOUND };
      await prisma.placeNote.deleteMany({ where: { id, placeId: note.placeId } });
      tags = [cacheTags.placeNotes(note.placeId)];
    } else if (kind === "sceneNote") {
      const note = await prisma.sceneNote.findFirst({
        where: { id, trashedAt: hidden, scene: { ...owner, trashedAt: null } },
        select: { sceneId: true },
      });
      if (!note) return { success: false, error: NOT_FOUND };
      await prisma.sceneNote.deleteMany({ where: { id, sceneId: note.sceneId } });
      tags = [cacheTags.sceneNotes(note.sceneId)];
    } else if (kind === "projectNote") {
      const { count } = await prisma.projectNote.deleteMany({ where: { id, ...owner, trashedAt: hidden } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.projectNotes(projectId)];
    } else if (kind === "researchFolder") {
      if (!(await deleteResearchFolder(user.id, projectId, id))) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.research(projectId)];
    } else if (kind === "researchItem") {
      const { count } = await prisma.researchItem.deleteMany({ where: { id, ...owner, trashedAt: hidden } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.research(projectId), cacheTags.researchItem(id)];
    } else if (kind === "plotLine") {
      // Its points go with it (they cascade).
      const { count } = await prisma.plotLine.deleteMany({ where: { id, ...owner, trashedAt: hidden } });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.plot(projectId)];
    } else if (kind === "plotPoint") {
      const { count } = await prisma.plotPoint.deleteMany({
        where: { id, trashedAt: hidden, plotLine: { ...owner, trashedAt: null }, scene: { trashedAt: null } },
      });
      if (count === 0) return { success: false, error: NOT_FOUND };
      tags = [cacheTags.plot(projectId)];
    }

    refresh(projectId, [...tags, cacheTags.trash(projectId)]);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteItemPermanently failed:", error);
    return { success: false, error: "Could not delete the item. Please try again." };
  }
}

/** The cached reads an archived item shows up in once it is back (or gone). */
function archiveTags(projectId: string, kind: ArchiveRef["kind"], id: string) {
  if (kind === "character") return [cacheTags.characters(projectId), cacheTags.character(id), cacheTags.characterNotes(id)];
  if (kind === "place") return [cacheTags.places(projectId), cacheTags.place(id), cacheTags.placeNotes(id)];
  return [cacheTags.research(projectId), cacheTags.researchItem(id)];
}

export async function unarchiveItem(input: ArchiveRef): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = archiveRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, kind, id } = parsed.data;
    const where = { id, projectId, project: { userId: user.id }, trashedAt: null, archivedAt: { not: null } };

    let restored: boolean;
    if (kind === "researchFolder") restored = await restoreResearchFolder(user.id, projectId, id, "archivedAt");
    else if (kind === "researchItem") restored = await restoreResearchItem(user.id, projectId, id, "archivedAt");
    else {
      const { count } =
        kind === "character"
          ? await prisma.character.updateMany({ where, data: { archivedAt: null } })
          : await prisma.place.updateMany({ where, data: { archivedAt: null } });
      restored = count > 0;
    }
    if (!restored) return { success: false, error: "That item is not archived." };

    refresh(projectId, [...archiveTags(projectId, kind, id), cacheTags.archive(projectId)]);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("unarchiveItem failed:", error);
    return { success: false, error: "Could not unarchive the item. Please try again." };
  }
}

/** Moves an archived character or place to the trash. It leaves the Archive: an item is in one place at a time. */
export async function trashArchivedItem(input: ArchiveRef): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = archiveRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, kind, id } = parsed.data;
    const where = { id, projectId, project: { userId: user.id }, trashedAt: null, archivedAt: { not: null } };
    const data = { trashedAt: new Date(), archivedAt: null };

    let moved: boolean;
    if (kind === "researchFolder" || kind === "researchItem") moved = await trashArchivedResearch(user.id, projectId, kind, id);
    else {
      const { count } =
        kind === "character" ? await prisma.character.updateMany({ where, data }) : await prisma.place.updateMany({ where, data });
      moved = count > 0;
    }
    if (!moved) return { success: false, error: "That item is not archived." };

    refresh(projectId, [...archiveTags(projectId, kind, id), cacheTags.archive(projectId), cacheTags.trash(projectId)]);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("trashArchivedItem failed:", error);
    return { success: false, error: "Could not move the item to the trash. Please try again." };
  }
}
