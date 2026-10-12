import type { ComponentType } from "react";
import { BookmarkIcon, FileTextIcon, LayersIcon } from "lucide-react";
import type { NodeType } from "@/lib/manuscript-config";
import { BOOK_DROP_ID } from "@/lib/manuscript-tree";

/** The book row (the project itself): its collapse key and its drop-target id. Real nodes use their ids. */
export const ROOT_KEY = BOOK_DROP_ID;

export const iconClass = "size-4 shrink-0";

/** A plain link row in the sidebar (Book view). */
export const rowClass =
  "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A tree row (the treeitem itself). It is the positioning parent of the grip handle (left) and the "…" menu (right),
 * and the group both use to show themselves on hover or keyboard focus.
 */
export const treeRowClass =
  "group/row group/item relative flex min-w-0 items-center gap-1.5 rounded-md py-1.5 pr-8 pl-6 text-sm outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

export const TYPE_LABEL: Record<NodeType, string> = {
  PART: "part",
  CHAPTER: "chapter",
  SCENE: "scene",
};

export const NODE_ICON: Record<NodeType, ComponentType<{ className?: string }>> = {
  PART: LayersIcon,
  CHAPTER: BookmarkIcon,
  SCENE: FileTextIcon,
};
