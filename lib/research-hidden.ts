import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { planFolderDelete } from "@/lib/research-tree";
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

/**
 * Readies trashed folders to be deleted for good, in a transaction that holds the project lock: a folder delete cascades
 * to everything under it, so anything archived or live under them is moved to the top level first, to survive. Returns
 * the stored-file keys of the uploads the delete will take, for the caller to delete once the transaction commits.
 */
export async function prepareResearchFolderDelete(tx: Tx, projectId: string, rootIds: string[]): Promise<string[]> {
  if (rootIds.length === 0) return [];
  const [folders, items] = await Promise.all([
    allFolders(tx, projectId),
    tx.researchItem.findMany({
      where: { projectId, folderId: { not: null } },
      select: { id: true, folderId: true, trashedAt: true, archivedAt: true, fileKey: true },
    }),
  ]);
  const plan = planFolderDelete(folders, items, rootIds);

  const rescued = [
    ...folders.filter((f) => plan.rescueFolderIds.includes(f.id)).map((f) => ({ kind: "folder" as const, ...f })),
    ...items.filter((i) => plan.rescueItemIds.includes(i.id)).map((i) => ({ kind: "item" as const, ...i })),
  ];
  // A hidden row gets its position when it is restored; a live one (which should not be here) goes to the end.
  const next = {
    folder: await tx.researchFolder.count({ where: { projectId, parentId: null, ...live } }),
    item: await tx.researchItem.count({ where: { projectId, folderId: null, ...live } }),
  };
  for (const row of rescued) {
    const position = !row.trashedAt && !row.archivedAt ? next[row.kind]++ : undefined;
    if (row.kind === "folder") {
      await tx.researchFolder.update({ where: { id: row.id }, data: { parentId: null, ...(position !== undefined && { position }) } });
    } else {
      await tx.researchItem.update({ where: { id: row.id }, data: { folderId: null, ...(position !== undefined && { position }) } });
    }
  }

  return items.flatMap((i) => (plan.itemIds.includes(i.id) && i.fileKey ? [i.fileKey] : []));
}

/**
 * Deletes a trashed folder for good, with what was trashed under it; what was archived under it moves to the top level.
 * Returns the stored-file keys that went with it, or null when the folder is not in the trash.
 */
export async function deleteResearchFolder(userId: string, projectId: string, id: string): Promise<string[] | null> {
  return prisma.$transaction(async (tx) => {
    if (!(await lockOwnedProject(tx, userId, projectId))) return null;
    if (!(await folderGroup(tx, projectId, id, "trashedAt"))) return null;
    const fileKeys = await prepareResearchFolderDelete(tx, projectId, [id]);
    await tx.researchFolder.deleteMany({ where: { id, projectId } });
    return fileKeys;
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
