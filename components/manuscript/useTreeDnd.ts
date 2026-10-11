"use client";

import { useId, useState, type TransitionStartFunction } from "react";
import {
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DndContextProps,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, type SortingStrategy } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { moveNode } from "@/actions/manuscript";
import { BOOK_DROP_ID, childrenOf, planMove, resolveDrop, type MovePlan } from "@/lib/manuscript-tree";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

export type TreeChange =
  | { kind: "rename"; id: string; title: string }
  | { kind: "move"; plan: MovePlan };

/** Rows keep their place while dragging; the drop target is shown by a ring and the dragged item by the overlay. */
export const noShift: SortingStrategy = () => null;

interface UseTreeDndArgs {
  projectId: string;
  nodes: ManuscriptNodeSummary[];
  collapsed: Record<string, true>;
  rootCollapsed: boolean;
  toggle: (id: string, collapse?: boolean) => void;
  applyChange: (change: TreeChange) => void;
  startTransition: TransitionStartFunction;
  focusRow: (id: string) => void;
}

/** Drag-and-drop state and handlers for the tree: what is dragged, what it is over, and how a drop is applied. */
export function useTreeDnd({
  projectId,
  nodes,
  collapsed,
  rootCollapsed,
  toggle,
  applyChange,
  startTransition,
  focusRow,
}: UseTreeDndArgs) {
  const id = useId();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const titleOf = (nodeId: string | number) =>
    nodeId === BOOK_DROP_ID ? "the book" : (nodes.find((n) => n.id === nodeId)?.title ?? "item");

  /** Ids of the rows on screen, in order: what keyboard dragging can move through. */
  function visibleIds() {
    const out: string[] = [];
    if (rootCollapsed) return out;
    const walk = (parentId: string | null) => {
      for (const n of childrenOf(nodes, parentId)) {
        out.push(n.id);
        if (n.type !== "SCENE" && !collapsed[n.id]) walk(n.id);
      }
    };
    walk(null);
    return out;
  }

  function endDrag() {
    setDragId(null);
    setOverId(null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    endDrag();
    const nodeId = String(active.id);
    // The dragged item stays in focus, wherever it lands (or if it goes nowhere).
    focusRow(nodeId);
    if (!over) return;
    const drop = resolveDrop(nodes, nodeId, String(over.id));
    if (!drop) return;
    const plan = planMove(nodes, nodeId, drop.parentId, drop.index);
    if ("error" in plan) {
      toast.error(plan.error);
      return;
    }
    const unchanged = plan.updates.every((u) => {
      const n = nodes.find((x) => x.id === u.id);
      return n && n.parentId === u.parentId && n.position === u.position;
    });
    if (unchanged) return;
    // Open the destination so the moved item stays in view.
    if (drop.parentId) toggle(drop.parentId, false);
    startTransition(async () => {
      applyChange({ kind: "move", plan });
      const result = await moveNode({ projectId, nodeId, parentId: drop.parentId, index: drop.index });
      if (!result.success) toast.error(result.error);
    });
  }

  const contextProps: DndContextProps = {
    id,
    sensors,
    collisionDetection: closestCenter,
    onDragStart: ({ active }) => setDragId(String(active.id)),
    onDragOver: ({ over }) => setOverId(over ? String(over.id) : null),
    onDragEnd: handleDragEnd,
    onDragCancel: ({ active }) => {
      endDrag();
      focusRow(String(active.id));
    },
    accessibility: {
      announcements: {
        onDragStart: ({ active }) =>
          `Picked up ${titleOf(active.id)}. Use the arrow keys to move it and space to drop it.`,
        onDragOver: ({ active, over }) => {
          if (!over) return `${titleOf(active.id)} is not over a target.`;
          return resolveDrop(nodes, String(active.id), String(over.id))
            ? `${titleOf(active.id)} is over ${titleOf(over.id)}.`
            : `${titleOf(active.id)} cannot be dropped on ${titleOf(over.id)}.`;
        },
        onDragEnd: ({ active, over }) =>
          over && resolveDrop(nodes, String(active.id), String(over.id))
            ? `Dropped ${titleOf(active.id)} at ${titleOf(over.id)}.`
            : `${titleOf(active.id)} was not moved.`,
        onDragCancel: ({ active }) => `Dragging ${titleOf(active.id)} was cancelled.`,
      },
    },
  };

  return {
    contextProps,
    items: visibleIds(),
    dragNode: nodes.find((n) => n.id === dragId),
    /** Whether the item being dragged would land on this row, which then shows a ring. */
    isDropTarget: (nodeId: string) =>
      dragId !== null && overId === nodeId && dragId !== nodeId && !!resolveDrop(nodes, dragId, nodeId),
  };
}
