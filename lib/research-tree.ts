import { MAX_FOLDER_DEPTH } from "@/lib/research-config";

export interface FolderNode {
  id: string;
  parentId: string | null;
  position: number;
}

export interface ItemNode {
  id: string;
  folderId: string | null;
  position: number;
}

/** A folder's child folders (or the top-level ones, for null), in order. */
export function childFolders<T extends FolderNode>(folders: T[], parentId: string | null): T[] {
  return folders.filter((f) => f.parentId === parentId).sort((a, b) => a.position - b.position);
}

/** The items directly in a folder (or at the top level, for null), in order. */
export function folderItems<T extends ItemNode>(items: T[], folderId: string | null): T[] {
  return items.filter((i) => i.folderId === folderId).sort((a, b) => a.position - b.position);
}

/** The folder and every folder under it, parents first. */
export function folderSubtree(folders: { id: string; parentId: string | null }[], id: string): string[] {
  const ids = [id];
  for (let i = 0; i < ids.length; i++) for (const f of folders) if (f.parentId === ids[i]) ids.push(f.id);
  return ids;
}

interface HiddenState {
  trashedAt: Date | null;
  archivedAt: Date | null;
}

export interface FolderDeletePlan {
  /** The folders that go: the roots and everything under them that isn't rescued. */
  folderIds: string[];
  /** Untrashed folders inside, moved to the top level (with what is in them) so the delete does not take them. */
  rescueFolderIds: string[];
  /** Untrashed items directly in a folder that goes, moved to the top level. */
  rescueItemIds: string[];
  /** The items that go with the folders. */
  itemIds: string[];
}

/**
 * What deleting the trashed folders `rootIds` for good takes with it. A delete cascades to everything under a folder, but
 * a folder or item archived (or, by bad luck, left live) inside one is not in the Trash, so it is rescued to the top level
 * instead of disappearing from the Archive.
 */
export function planFolderDelete(
  folders: ({ id: string; parentId: string | null } & HiddenState)[],
  items: ({ id: string; folderId: string | null } & HiddenState)[],
  rootIds: string[],
): FolderDeletePlan {
  const doomed = new Set<string>();
  const rescueFolderIds: string[] = [];
  const visit = (id: string) => {
    if (doomed.has(id)) return;
    doomed.add(id);
    for (const f of folders) {
      if (f.parentId !== id) continue;
      if (f.trashedAt) visit(f.id);
      else rescueFolderIds.push(f.id);
    }
  };
  for (const id of rootIds) visit(id);
  const inside = items.filter((i) => i.folderId !== null && doomed.has(i.folderId));
  return {
    folderIds: [...doomed],
    rescueFolderIds,
    rescueItemIds: inside.filter((i) => !i.trashedAt).map((i) => i.id),
    itemIds: inside.filter((i) => i.trashedAt).map((i) => i.id),
  };
}

/** How deep a folder sits: 1 at the top level, and 0 for null (the top level itself). */
export function folderDepth(folders: { id: string; parentId: string | null }[], id: string | null): number {
  const byId = new Map(folders.map((f) => [f.id, f]));
  let depth = 0;
  for (let at = id; at; at = byId.get(at)?.parentId ?? null) {
    depth++;
    // Bad data with a cycle: stop rather than spin.
    if (depth > folders.length) break;
  }
  return depth;
}

/** How many levels a folder's subtree spans, counting the folder itself (1 when it has no subfolders). */
export function subtreeHeight(folders: { id: string; parentId: string | null }[], id: string): number {
  const children = folders.filter((f) => f.parentId === id);
  return 1 + Math.max(0, ...children.map((c) => subtreeHeight(folders, c.id)));
}

/**
 * Why a folder cannot move under `parentId`, or null when it can: not into itself or one of its own subfolders, and not
 * so deep that a folder in it ends up past the depth limit.
 */
export function folderMoveError(
  folders: { id: string; parentId: string | null }[],
  folderId: string,
  parentId: string | null,
): string | null {
  if (parentId !== null && folderSubtree(folders, folderId).includes(parentId)) return "A folder can't go inside itself.";
  if (folderDepth(folders, parentId) + subtreeHeight(folders, folderId) > MAX_FOLDER_DEPTH) {
    return `Folders can only nest ${MAX_FOLDER_DEPTH} levels deep.`;
  }
  return null;
}

/** New 0..n-1 positions for a group of siblings after putting `id` at `index` among them (it is taken out first if already there). */
export function reorder(siblings: { id: string; position: number }[], id: string, index: number): { id: string; position: number }[] {
  const ordered = [...siblings].sort((a, b) => a.position - b.position).filter((s) => s.id !== id);
  const at = Math.max(0, Math.min(index, ordered.length));
  const ids = [...ordered.slice(0, at).map((s) => s.id), id, ...ordered.slice(at).map((s) => s.id)];
  return ids.map((sid, position) => ({ id: sid, position }));
}

/** The siblings left behind after one moved out, renumbered 0..n-1: only those whose position changes. */
export function closeGap(siblings: { id: string; position: number }[]): { id: string; position: number }[] {
  return [...siblings]
    .sort((a, b) => a.position - b.position)
    .map((s, position) => ({
      id: s.id,
      position,
      changed: s.position !== position,
    }))
    .filter((s) => s.changed)
    .map(({ id, position }) => ({ id, position }));
}

/** Drag-and-drop ids: folders and items share one list, so each carries its kind. */
export const RESEARCH_ROOT_DROP_ID = "research-root";
export const folderDragId = (id: string) => `folder:${id}`;
export const itemDragId = (id: string) => `item:${id}`;

export function parseDragId(dragId: string): { kind: "folder" | "item"; id: string } | { kind: "root" } | null {
  if (dragId === RESEARCH_ROOT_DROP_ID) return { kind: "root" };
  const colon = dragId.indexOf(":");
  const kind = dragId.slice(0, colon);
  const id = dragId.slice(colon + 1);
  return colon > 0 && (kind === "folder" || kind === "item") && id ? { kind, id } : null;
}

export interface ResearchDrop {
  /** The folder it lands in (null for the top level). */
  parentId: string | null;
  index: number;
}

/**
 * Where a dragged folder or item lands when dropped on a row:
 * - on a folder: inside it, at the end (of its folders for a folder, of its items for an item);
 * - an item on an item: in that item's folder, just before it;
 * - a folder on an item: in that item's folder, after its folders;
 * - on the top-level drop zone: at the end of the top level.
 * Null when the drop means nothing (dropped on itself) or breaks the folder rules.
 */
export function resolveResearchDrop(folders: FolderNode[], items: ItemNode[], activeId: string, overId: string): ResearchDrop | null {
  const active = parseDragId(activeId);
  const over = parseDragId(overId);
  if (!active || active.kind === "root" || !over || activeId === overId) return null;
  const endOf = (parentId: string | null): ResearchDrop =>
    active.kind === "folder"
      ? {
          parentId,
          index: childFolders(folders, parentId).filter((f) => f.id !== active.id).length,
        }
      : {
          parentId,
          index: folderItems(items, parentId).filter((i) => i.id !== active.id).length,
        };

  let target: ResearchDrop;
  if (over.kind === "root") target = endOf(null);
  else if (over.kind === "folder") target = endOf(over.id);
  else {
    const overItem = items.find((i) => i.id === over.id);
    if (!overItem) return null;
    if (active.kind === "folder") target = endOf(overItem.folderId);
    else {
      const siblings = folderItems(items, overItem.folderId).filter((i) => i.id !== active.id);
      target = {
        parentId: overItem.folderId,
        index: siblings.findIndex((i) => i.id === overItem.id),
      };
    }
  }

  if (active.kind === "folder" && folderMoveError(folders, active.id, target.parentId)) return null;
  return target;
}
