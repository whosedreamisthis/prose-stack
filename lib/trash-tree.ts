export interface TrashNode {
  id: string;
  parentId: string | null;
  trashedAt: Date | null;
}

const sameMoment = (a: Date | null, b: Date | null) => !!a && !!b && a.getTime() === b.getTime();

/**
 * The trashed nodes that show up as items in the Trash. A node trashed together with its parent is part of the parent's
 * item, so only the top of each trashed group is listed: a trashed node whose parent is live, or was trashed at a
 * different moment (the node had been trashed on its own earlier). Pure, so it is tested without a database.
 */
export function trashRoots<T extends TrashNode>(nodes: T[]): T[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  return nodes.filter((n) => {
    if (!n.trashedAt) return false;
    const parent = n.parentId ? byId.get(n.parentId) : undefined;
    return !parent || !sameMoment(parent.trashedAt, n.trashedAt);
  });
}

/** The node and every descendant trashed in the same moment: what a restore (or a permanent delete) of that item covers. */
export function trashGroupIds(nodes: TrashNode[], id: string): string[] {
  const root = nodes.find((n) => n.id === id);
  if (!root?.trashedAt) return [];
  const ids = [id];
  for (let i = 0; i < ids.length; i++) {
    for (const n of nodes) if (n.parentId === ids[i] && sameMoment(n.trashedAt, root.trashedAt)) ids.push(n.id);
  }
  return ids;
}

/** The trashed ancestors a restored node needs back so it is not left under a hidden parent, nearest first. */
export function trashedAncestorIds(nodes: TrashNode[], id: string): string[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const out: string[] = [];
  let parentId = byId.get(id)?.parentId ?? null;
  while (parentId) {
    const parent = byId.get(parentId);
    if (!parent?.trashedAt) break;
    out.push(parent.id);
    parentId = parent.parentId;
  }
  return out;
}
