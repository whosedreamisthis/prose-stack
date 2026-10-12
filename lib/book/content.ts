import { childrenOf } from "@/lib/manuscript-tree";
import type { DocNode } from "@/lib/manuscript-text";
import type { BookNode } from "@/types/manuscript";

/** The book as the pages need it, in reading order: a part is a title, a chapter is a title and its scenes' text. */
export type BookItem = { kind: "part"; title: string } | { kind: "chapter"; title: string; scenes: (DocNode | null)[] };

/** Walks the outline in reading order. Scenes are only read inside a chapter; trashed nodes are not in `nodes`. */
export function buildBookItems(nodes: BookNode[]): BookItem[] {
  const items: BookItem[] = [];
  const walk = (parentId: string | null) => {
    for (const node of childrenOf(nodes, parentId)) {
      if (node.type === "PART") {
        items.push({ kind: "part", title: node.title });
        walk(node.id);
      } else if (node.type === "CHAPTER") {
        const scenes = childrenOf(nodes, node.id)
          .filter((n) => n.type === "SCENE")
          .map((n) => n.content);
        items.push({ kind: "chapter", title: node.title, scenes });
      }
    }
  };
  walk(null);
  return items;
}
