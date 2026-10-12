import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { trashGroupIds, trashRoots } from "@/lib/trash-tree";

/** Which hiding a call is about: the Trash (`trashedAt`) or the Archive (`archivedAt`). */
export type HiddenField = "trashedAt" | "archivedAt";

type Tx = Prisma.TransactionClient;
type HiddenFolder = {
  id: string;
  parentId: string | null;
  trashedAt: Date | null;
  archivedAt: Date | null;
};

const live = { trashedAt: null, archivedAt: null } as const;
/** The rows hidden by `field` and not by the other one: an archived folder later trashed is in the Trash only. */
const hiddenBy = (field: HiddenField) =>
  field === "trashedAt" ? { trashedAt: { not: null } } : { trashedAt: null, archivedAt: { not: null } };

/** Folders reshaped for the shared trash-tree helpers, which read the moment from `trashedAt`. */
function byMoment(folders: HiddenFolder[], field: HiddenField) {
  return folders.map((f) => ({
    id: f.id,
    parentId: f.parentId,
    trashedAt: field === "trashedAt" ? f.trashedAt : f.trashedAt ? null : f.archivedAt,
  }));
}

async function lockOwnedProject(tx: Tx, userId: string, projectId: string) {
  const rows = await tx.$queryRaw<
    { id: string }[]
  >`SELECT "id" FROM "Project" WHERE "id" = ${projectId} AND "userId" = ${userId} FOR UPDATE`;
  return rows.length > 0;
}

function allFolders(tx: Tx | typeof prisma, projectId: string): Promise<HiddenFolder[]> {
  return tx.researchFolder.findMany({
    where: { projectId },
    select: { id: true, parentId: true, trashedAt: true, archivedAt: true },
  });
}

/**
 * The research rows the Trash or Archive lists: the top folder of each group hidden together, and items hidden on their
 * own (not with their folder), each with how much came with it.
 */
export async function listHiddenResearch(userId: string, projectId: string, field: HiddenField) {
  const owner = { projectId, project: { userId } };
  const [folders, items] = await Promise.all([
    prisma.researchFolder.findMany({
      where: owner,
      select: {
        id: true,
        parentId: true,
        name: true,
        trashedAt: true,
        archivedAt: true,
      },
    }),
    prisma.researchItem.findMany({
      where: { ...owner, ...hiddenBy(field) },
      select: {
        id: true,
        folderId: true,
        type: true,
        title: true,
        trashedAt: true,
        archivedAt: true,
      },
    }),
  ]);
  const moments = byMoment(folders, field);
  const momentOf = new Map(moments.map((f) => [f.id, f.trashedAt?.getTime() ?? null]));
  const itemMoment = (i: (typeof items)[number]) => (field === "trashedAt" ? i.trashedAt! : i.archivedAt!).getTime();

  const roots = trashRoots(moments).map((root) => {
    const group = new Set(trashGroupIds(moments, root.id));
    const at = root.trashedAt!.getTime();
    const inside = group.size - 1 + items.filter((i) => i.folderId && group.has(i.folderId) && itemMoment(i) === at).length;
    return {
      id: root.id,
      name: folders.find((f) => f.id === root.id)!.name,
      at,
      inside,
    };
  });
  // An item hidden with its folder comes back with it, so only items hidden at another moment are listed on their own.
  const loose = items.filter((i) => !i.folderId || momentOf.get(i.folderId) !== itemMoment(i)).map((i) => ({ ...i, at: itemMoment(i) }));
  return { folders: roots, items: loose };
}

/** The folders and items a hidden folder brings back (or takes with it): its group, and the items hidden with them. */
async function folderGroup(tx: Tx, projectId: string, id: string, field: HiddenField) {
  const folders = await allFolders(tx, projectId);
  const moments = byMoment(folders, field);
  const root = moments.find((f) => f.id === id);
  if (!root?.trashedAt) return null;
  const group = trashGroupIds(moments, id);
  return {
    folders,
    root: folders.find((f) => f.id === id)!,
    group,
    at: root.trashedAt,
  };
}

/** Puts a hidden folder back, with what was hidden with it, at the end of its parent's folders (the top level if the parent is hidden). */
export async function restoreResearchFolder(userId: string, projectId: string, id: string, field: HiddenField): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return false;
    const found = await folderGroup(tx, projectId, id, field);
    if (!found) return false;
    const { folders, root, group, at } = found;
    const parent = folders.find((f) => f.id === root.parentId);
    const parentId = parent && !parent.trashedAt && !parent.archivedAt ? parent.id : null;
    const position = await tx.researchFolder.count({
      where: { projectId, parentId, ...live },
    });

    await tx.researchFolder.updateMany({
      where: { id: { in: group }, projectId, [field]: at },
      data: { [field]: null },
    });
    await tx.researchItem.updateMany({
      where: { folderId: { in: group }, projectId, [field]: at },
      data: { [field]: null },
    });
    await tx.researchFolder.update({
      where: { id },
      data: { parentId, position },
    });
    return true;
  });
}

/** Deletes a hidden folder for good; its subfolders and items go with it (they cascade). */
export async function deleteResearchFolder(userId: string, projectId: string, id: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return false;
    if (!(await folderGroup(tx, projectId, id, "trashedAt"))) return false;
    await tx.researchFolder.deleteMany({ where: { id, projectId } });
    return true;
  });
}

/** Puts a hidden item back at the end of its folder (the top level if the folder is hidden or gone). */
export async function restoreResearchItem(userId: string, projectId: string, id: string, field: HiddenField): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return false;
    const item = await tx.researchItem.findFirst({
      where: { id, projectId, ...hiddenBy(field) },
      select: {
        folder: { select: { id: true, trashedAt: true, archivedAt: true } },
      },
    });
    if (!item) return false;
    const folderId = item.folder && !item.folder.trashedAt && !item.folder.archivedAt ? item.folder.id : null;
    const position = await tx.researchItem.count({
      where: { projectId, folderId, ...live },
    });
    await tx.researchItem.update({
      where: { id },
      data: { [field]: null, folderId, position },
    });
    return true;
  });
}

/** Moves an archived folder or item (with what was archived with it) to the trash, keeping them together. */
export async function trashArchivedResearch(userId: string, projectId: string, kind: "researchFolder" | "researchItem", id: string) {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return false;
    const now = new Date();
    if (kind === "researchItem") {
      const { count } = await tx.researchItem.updateMany({
        where: { id, projectId, ...hiddenBy("archivedAt") },
        data: { trashedAt: now, archivedAt: null },
      });
      return count > 0;
    }
    const found = await folderGroup(tx, projectId, id, "archivedAt");
    if (!found) return false;
    const { group, at } = found;
    await tx.researchFolder.updateMany({
      where: { id: { in: group }, projectId, archivedAt: at },
      data: { trashedAt: now, archivedAt: null },
    });
    await tx.researchItem.updateMany({
      where: { folderId: { in: group }, projectId, archivedAt: at },
      data: { trashedAt: now, archivedAt: null },
    });
    return true;
  });
}
