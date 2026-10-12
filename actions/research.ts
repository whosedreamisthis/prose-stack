"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { emptyDoc } from "@/lib/manuscript-text";
import {
  DEFAULT_FOLDER_NAME,
  DEFAULT_LINK_TITLE,
  DEFAULT_NOTE_TITLE,
  MAX_FOLDER_DEPTH,
  MAX_RESEARCH_FOLDERS,
  MAX_RESEARCH_ITEMS,
  STARTER_FOLDERS,
  createFolderSchema,
  createItemSchema,
  folderRefSchema,
  itemRefSchema,
  moveFolderSchema,
  moveItemSchema,
  projectRefSchema,
  renameFolderSchema,
  setItemLinkSchema,
  updateItemSchema,
  type SetItemLinkInput,
  type UpdateItemInput,
} from "@/lib/research-config";
import { closeGap, folderDepth, folderMoveError, folderSubtree, reorder } from "@/lib/research-tree";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const PROJECT_NOT_FOUND = "Project not found.";
const FOLDER_NOT_FOUND = "Folder not found.";
const ITEM_NOT_FOUND = "Item not found.";
const live = { trashedAt: null, archivedAt: null } as const;

type Tx = Prisma.TransactionClient;

/** An error a write returns to the caller (as opposed to an unexpected failure, which is logged and replaced). */
class ResearchError extends Error {}

/** After a write: expire the cached reads it changed and refresh the open page. The tags must match lib/research.ts. */
function refresh(projectId: string, ...tags: string[]) {
  for (const tag of [cacheTags.research(projectId), ...tags]) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

/**
 * The shared shape of every action: signed in, valid input, then the write. A `ResearchError` thrown by the write becomes
 * its message; anything else is logged and becomes `failure`.
 */
async function run<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  failure: string,
  write: (data: z.output<S>, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = schema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request.",
      };
    return { success: true, data: await write(parsed.data, user.id) };
  } catch (error) {
    if (error instanceof ResearchError) return { success: false, error: error.message };
    console.error(`${failure}`, error);
    return { success: false, error: failure };
  }
}

/** Locks the project row so concurrent edits to one project's research run one at a time (positions and limits hold). */
async function lockOwnedProject(tx: Tx, userId: string, projectId: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Project" WHERE "id" = ${projectId} AND "userId" = ${userId} FOR UPDATE`;
  if (rows.length === 0) throw new ResearchError(PROJECT_NOT_FOUND);
}

/** The project's live folders, for the tree rules. */
function liveFolders(tx: Tx, projectId: string) {
  return tx.researchFolder.findMany({
    where: { projectId, ...live },
    select: { id: true, parentId: true, position: true },
  });
}

/** A live folder of the project, or a `ResearchError` (null is the top level and always exists). */
async function requireFolder(tx: Tx, projectId: string, folderId: string | null) {
  if (folderId === null) return;
  const folder = await tx.researchFolder.findFirst({
    where: { id: folderId, projectId, ...live },
    select: { id: true },
  });
  if (!folder) throw new ResearchError(FOLDER_NOT_FOUND);
}

async function savePositions(
  tx: Tx,
  model: "folder" | "item",
  positions: { id: string; position: number }[],
  parent: Record<string, string | null>,
) {
  for (const { id, position } of positions) {
    if (model === "folder")
      await tx.researchFolder.update({
        where: { id },
        data: { position, ...parent },
      });
    else
      await tx.researchItem.update({
        where: { id },
        data: { position, ...parent },
      });
  }
}

export async function createResearchFolder(input: { projectId: string; parentId: string | null; id?: string }) {
  return run(createFolderSchema, input, "Could not add the folder. Please try again.", async ({ projectId, parentId, id }, userId) => {
    const created = await prisma.$transaction(async (tx) => {
      await lockOwnedProject(tx, userId, projectId);
      await requireFolder(tx, projectId, parentId);
      const folders = await liveFolders(tx, projectId);
      if (folders.length >= MAX_RESEARCH_FOLDERS)
        throw new ResearchError(`A project can have up to ${MAX_RESEARCH_FOLDERS} research folders.`);
      if (folderDepth(folders, parentId) >= MAX_FOLDER_DEPTH)
        throw new ResearchError(`Folders can only nest ${MAX_FOLDER_DEPTH} levels deep.`);
      const position = folders.filter((f) => f.parentId === parentId).length;
      return tx.researchFolder.create({
        data: {
          ...(id && { id }),
          projectId,
          parentId,
          name: DEFAULT_FOLDER_NAME,
          position,
        },
        select: { id: true },
      });
    });
    refresh(projectId);
    return { id: created.id };
  });
}

export async function createResearchItem(input: { projectId: string; folderId: string | null; type: "NOTE" | "LINK"; id?: string }) {
  return run(createItemSchema, input, "Could not add the item. Please try again.", async ({ projectId, folderId, type, id }, userId) => {
    const created = await prisma.$transaction(async (tx) => {
      await lockOwnedProject(tx, userId, projectId);
      await requireFolder(tx, projectId, folderId);
      if ((await tx.researchItem.count({ where: { projectId, ...live } })) >= MAX_RESEARCH_ITEMS) {
        throw new ResearchError(`A project can have up to ${MAX_RESEARCH_ITEMS} research items.`);
      }
      const position = await tx.researchItem.count({
        where: { projectId, folderId, ...live },
      });
      return tx.researchItem.create({
        data: {
          ...(id && { id }),
          projectId,
          folderId,
          type,
          title: type === "NOTE" ? DEFAULT_NOTE_TITLE : DEFAULT_LINK_TITLE,
          ...(type === "NOTE" && {
            content: emptyDoc() as Prisma.InputJsonValue,
          }),
          position,
        },
        select: { id: true },
      });
    });
    refresh(projectId);
    return { id: created.id };
  });
}

export async function renameResearchFolder(input: { projectId: string; folderId: string; name: string }) {
  return run(renameFolderSchema, input, "Could not rename the folder. Please try again.", async ({ projectId, folderId, name }, userId) => {
    const { count } = await prisma.researchFolder.updateMany({
      where: { id: folderId, projectId, project: { userId }, ...live },
      data: { name },
    });
    if (count === 0) throw new ResearchError(FOLDER_NOT_FOUND);
    refresh(projectId);
  });
}

export async function updateResearchItem(input: UpdateItemInput) {
  return run(updateItemSchema, input, "Could not save. Please try again.", async ({ projectId, itemId, changes }, userId) => {
    const { content, url, description, ...rest } = changes;
    const { count } = await prisma.researchItem.updateMany({
      // An upload's address is the stored file's, set by the server; only a link's can change.
      where: { id: itemId, projectId, project: { userId }, ...live, ...(url !== undefined && { type: "LINK" as const }) },
      data: {
        ...rest,
        ...(content !== undefined && {
          content: content as Prisma.InputJsonValue,
        }),
        ...(url !== undefined && { url: url || null }),
        ...(description !== undefined && {
          description: description || null,
        }),
      },
    });
    if (count === 0) throw new ResearchError(ITEM_NOT_FOUND);
    // The tree shows only the title, so other edits leave it cached.
    if (changes.title !== undefined) refresh(projectId, cacheTags.researchItem(itemId));
    else {
      updateTag(cacheTags.researchItem(itemId));
      revalidatePath(`/projects/${projectId}`, "layout");
    }
  });
}

/** Moves a folder under `parentId` (null: the top level) at `index` among its folders. Refused if it would go inside itself or too deep. */
export async function moveResearchFolder(input: { projectId: string; folderId: string; parentId: string | null; index: number }) {
  return run(
    moveFolderSchema,
    input,
    "Could not move the folder. Please try again.",
    async ({ projectId, folderId, parentId, index }, userId) => {
      await prisma.$transaction(async (tx) => {
        await lockOwnedProject(tx, userId, projectId);
        const folders = await liveFolders(tx, projectId);
        const folder = folders.find((f) => f.id === folderId);
        if (!folder || (parentId !== null && !folders.some((f) => f.id === parentId))) throw new ResearchError(FOLDER_NOT_FOUND);
        const error = folderMoveError(folders, folderId, parentId);
        if (error) throw new ResearchError(error);

        const target = reorder(
          folders.filter((f) => f.parentId === parentId),
          folderId,
          index,
        );
        await savePositions(
          tx,
          "folder",
          target.filter((t) => t.id !== folderId),
          {},
        );
        await savePositions(
          tx,
          "folder",
          target.filter((t) => t.id === folderId),
          { parentId },
        );
        if (folder.parentId !== parentId) {
          await savePositions(tx, "folder", closeGap(folders.filter((f) => f.parentId === folder.parentId && f.id !== folderId)), {});
        }
      });
      refresh(projectId);
    },
  );
}

/** Moves an item into a folder (null: the top level) at `index` among that folder's items. */
export async function moveResearchItem(input: { projectId: string; itemId: string; folderId: string | null; index: number }) {
  return run(
    moveItemSchema,
    input,
    "Could not move the item. Please try again.",
    async ({ projectId, itemId, folderId, index }, userId) => {
      await prisma.$transaction(async (tx) => {
        await lockOwnedProject(tx, userId, projectId);
        await requireFolder(tx, projectId, folderId);
        const item = await tx.researchItem.findFirst({
          where: { id: itemId, projectId, ...live },
          select: { folderId: true },
        });
        if (!item) throw new ResearchError(ITEM_NOT_FOUND);
        const siblings = await tx.researchItem.findMany({
          where: { projectId, folderId, ...live },
          select: { id: true, position: true },
        });
        const target = reorder(siblings, itemId, index);
        await savePositions(
          tx,
          "item",
          target.filter((t) => t.id !== itemId),
          {},
        );
        await savePositions(
          tx,
          "item",
          target.filter((t) => t.id === itemId),
          { folderId },
        );
        if (item.folderId !== folderId) {
          const left = await tx.researchItem.findMany({
            where: {
              projectId,
              folderId: item.folderId,
              ...live,
              id: { not: itemId },
            },
            select: { id: true, position: true },
          });
          await savePositions(tx, "item", closeGap(left), {});
        }
      });
      refresh(projectId, cacheTags.researchItem(itemId));
    },
  );
}

/** Links an item to one live character, place or scene of the same project, or clears the link (null). */
export async function setResearchItemLink(input: SetItemLinkInput) {
  return run(setItemLinkSchema, input, "Could not save the link. Please try again.", async ({ projectId, itemId, link }, userId) => {
    if (link) {
      const owner = { id: link.id, projectId, project: { userId } };
      const found =
        link.kind === "character"
          ? await prisma.character.findFirst({
              where: { ...owner, ...live },
              select: { id: true },
            })
          : link.kind === "place"
            ? await prisma.place.findFirst({
                where: { ...owner, ...live },
                select: { id: true },
              })
            : await prisma.manuscriptNode.findFirst({
                where: { ...owner, type: "SCENE", trashedAt: null },
                select: { id: true },
              });
      if (!found) throw new ResearchError(`That ${link.kind} was not found.`);
    }
    const { count } = await prisma.researchItem.updateMany({
      where: { id: itemId, projectId, project: { userId }, ...live },
      data: {
        characterId: link?.kind === "character" ? link.id : null,
        placeId: link?.kind === "place" ? link.id : null,
        sceneId: link?.kind === "scene" ? link.id : null,
      },
    });
    if (count === 0) throw new ResearchError(ITEM_NOT_FOUND);
    updateTag(cacheTags.researchItem(itemId));
    revalidatePath(`/projects/${projectId}`, "layout");
  });
}

/** Hides a folder with every live folder and item under it, all at one moment, so they come back together. */
async function hideFolder(input: { projectId: string; folderId: string }, field: "trashedAt" | "archivedAt", failure: string) {
  return run(folderRefSchema, input, failure, async ({ projectId, folderId }, userId) => {
    await prisma.$transaction(async (tx) => {
      await lockOwnedProject(tx, userId, projectId);
      const folders = await liveFolders(tx, projectId);
      if (!folders.some((f) => f.id === folderId)) throw new ResearchError(FOLDER_NOT_FOUND);
      const ids = folderSubtree(folders, folderId);
      const now = new Date();
      await tx.researchFolder.updateMany({
        where: { id: { in: ids }, projectId, ...live },
        data: { [field]: now },
      });
      await tx.researchItem.updateMany({
        where: { folderId: { in: ids }, projectId, ...live },
        data: { [field]: now },
      });
    });
    refresh(projectId, field === "trashedAt" ? cacheTags.trash(projectId) : cacheTags.archive(projectId));
  });
}

export async function trashResearchFolder(input: { projectId: string; folderId: string }) {
  return hideFolder(input, "trashedAt", "Could not move the folder to the trash. Please try again.");
}

export async function archiveResearchFolder(input: { projectId: string; folderId: string }) {
  return hideFolder(input, "archivedAt", "Could not archive the folder. Please try again.");
}

async function hideItem(input: { projectId: string; itemId: string }, field: "trashedAt" | "archivedAt", failure: string) {
  return run(itemRefSchema, input, failure, async ({ projectId, itemId }, userId) => {
    const { count } = await prisma.researchItem.updateMany({
      where: { id: itemId, projectId, project: { userId }, ...live },
      data: { [field]: new Date() },
    });
    if (count === 0) throw new ResearchError(ITEM_NOT_FOUND);
    refresh(projectId, cacheTags.researchItem(itemId), field === "trashedAt" ? cacheTags.trash(projectId) : cacheTags.archive(projectId));
  });
}

export async function trashResearchItem(input: { projectId: string; itemId: string }) {
  return hideItem(input, "trashedAt", "Could not move the item to the trash. Please try again.");
}

export async function archiveResearchItem(input: { projectId: string; itemId: string }) {
  return hideItem(input, "archivedAt", "Could not archive the item. Please try again.");
}

/**
 * After an upload: the file router added the item outside any Server Action, so this expires the tree's cached read and
 * the browser's copy of the page.
 */
export async function refreshResearch(input: { projectId: string }) {
  return run(projectRefSchema, input, "Could not refresh research. Please reload the page.", async ({ projectId }, userId) => {
    const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
    if (!project) throw new ResearchError(PROJECT_NOT_FOUND);
    refresh(projectId);
  });
}

/** Adds the worldbuilding starter folders at the top level. Only for a project with no research folders yet. */
export async function addStarterFolders(input: { projectId: string }) {
  return run(projectRefSchema, input, "Could not add the folders. Please try again.", async ({ projectId }, userId) => {
    await prisma.$transaction(async (tx) => {
      await lockOwnedProject(tx, userId, projectId);
      if ((await tx.researchFolder.count({ where: { projectId, ...live } })) > 0)
        throw new ResearchError("This project already has research folders.");
      await tx.researchFolder.createMany({
        data: STARTER_FOLDERS.map((name, position) => ({
          projectId,
          parentId: null,
          name,
          position,
        })),
      });
    });
    refresh(projectId);
  });
}
