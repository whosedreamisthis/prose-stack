import { canParent, type NodeType } from "@/lib/manuscript-config";

export interface TreeNode {
  id: string;
  parentId: string | null;
  type: NodeType;
  title: string;
  position: number;
}

export function childrenOf<T extends TreeNode>(nodes: T[], parentId: string | null): T[] {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.position - b.position);
}

/** Scenes in reading order: the order of the book. */
export function sceneOrder<T extends TreeNode>(nodes: T[]): T[] {
  const out: T[] = [];
  const walk = (parentId: string | null) => {
    for (const node of childrenOf(nodes, parentId)) {
      if (node.type === "SCENE") out.push(node);
      else walk(node.id);
    }
  };
  walk(null);
  return out;
}

export interface MovePlan {
  /** New position for every node whose parent or position changes, keyed by node id. */
  updates: { id: string; parentId: string | null; position: number }[];
}

/**
 * Plans moving `nodeId` under `parentId` at `index`. Returns an error message when the move breaks the hierarchy
 * (a scene must sit in a chapter, a chapter in the book or a part, a part in the book) or targets a missing node.
 */
export function planMove(
  nodes: TreeNode[],
  nodeId: string,
  parentId: string | null,
  index: number,
): MovePlan | { error: string } {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return { error: "Item not found." };
  const parent = parentId === null ? null : nodes.find((n) => n.id === parentId);
  if (parent === undefined) return { error: "Destination not found." };
  if (!canParent(parent?.type ?? null, node.type)) return { error: "That item can't go there." };

  const siblings = childrenOf(nodes, parentId).filter((n) => n.id !== nodeId);
  const at = Math.min(index, siblings.length);
  const reordered = [...siblings.slice(0, at), { ...node, parentId }, ...siblings.slice(at)];

  const updates = reordered
    .map((n, position) => ({ id: n.id, parentId, position, changed: n.id === nodeId || n.position !== position }))
    .filter((u) => u.changed)
    .map(({ id, parentId: p, position }) => ({ id, parentId: p, position }));

  // Close the gap left behind when the node changes parent.
  if (node.parentId !== parentId) {
    childrenOf(nodes, node.parentId)
      .filter((n) => n.id !== nodeId)
      .forEach((n, position) => {
        if (n.position !== position) updates.push({ id: n.id, parentId: node.parentId, position });
      });
  }
  return { updates };
}

/** Applies a plan to a node list (used for optimistic updates in the tree). */
export function applyMove<T extends TreeNode>(nodes: T[], plan: MovePlan): T[] {
  const byId = new Map(plan.updates.map((u) => [u.id, u]));
  return nodes.map((n) => {
    const u = byId.get(n.id);
    return u ? { ...n, parentId: u.parentId, position: u.position } : n;
  });
}

/** The scene to open: the one named in the URL if it exists, else the first scene in the book. */
export function resolveActiveScene<T extends TreeNode>(nodes: T[], requestedId: string | undefined): T | null {
  const scenes = sceneOrder(nodes);
  return scenes.find((s) => s.id === requestedId) ?? scenes[0] ?? null;
}

/** The id of the book row as a drop target: dropping a part or chapter on it moves that item to the end of the book. */
export const BOOK_DROP_ID = "root";

export interface DropTarget {
  parentId: string | null;
  index: number;
}

/**
 * Where a dragged item lands when dropped on another. Items reorder among their new siblings; a scene dropped on a
 * chapter goes to the end of that chapter, and a chapter dropped on a part goes to the end of that part.
 * Returns null when the drop means nothing (for example a part dropped on a scene).
 */
export function resolveDrop(nodes: TreeNode[], activeId: string, overId: string): DropTarget | null {
  const active = nodes.find((n) => n.id === activeId);
  if (overId === BOOK_DROP_ID) {
    // The way back out of a part (or to the end of the book): scenes cannot sit directly in the book.
    if (!active || active.type === "SCENE") return null;
    return { parentId: null, index: childrenOf(nodes, null).filter((n) => n.id !== active.id).length };
  }
  const over = nodes.find((n) => n.id === overId);
  if (!active || !over || active.id === over.id) return null;

  if (active.type === "SCENE" && over.type === "CHAPTER") {
    return { parentId: over.id, index: childrenOf(nodes, over.id).filter((n) => n.id !== active.id).length };
  }
  if (active.type === "CHAPTER" && over.type === "PART") {
    return { parentId: over.id, index: childrenOf(nodes, over.id).length };
  }
  if (active.type !== over.type) return null;

  const index = childrenOf(nodes, over.parentId).findIndex((n) => n.id === over.id);
  return { parentId: over.parentId, index };
}
