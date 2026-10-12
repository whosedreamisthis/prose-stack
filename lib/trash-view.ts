import type { DocNode } from "@/lib/manuscript-text";
import type { ViewSection } from "@/types/trash";

interface ViewNode {
  id: string;
  parentId: string | null;
  type: "PART" | "CHAPTER" | "SCENE";
  title: string;
  position: number;
}

/**
 * The sections of a trashed manuscript item, in reading order. A scene is its text; a chapter is its scenes' text one after
 * another; a part adds each chapter's title as a heading. `inGroup` limits it to what was trashed together with the item.
 * Pure, so it is tested without a database.
 */
export function nodeSections(nodes: ViewNode[], rootId: string, inGroup: Set<string>, docs: Map<string, DocNode | null>): ViewSection[] {
  const root = nodes.find((n) => n.id === rootId);
  if (!root) return [];
  const sections: ViewSection[] = [];
  const children = (parentId: string) =>
    nodes.filter((n) => n.parentId === parentId && inGroup.has(n.id)).sort((a, b) => a.position - b.position);

  const walk = (node: ViewNode) => {
    if (node.type === "SCENE") {
      sections.push({ doc: docs.get(node.id) ?? undefined, text: docs.get(node.id) ? undefined : "" });
      return;
    }
    if (node.id !== rootId) sections.push({ heading: node.title });
    for (const child of children(node.id)) walk(child);
  };
  walk(root);
  return sections;
}
