import type { KeyboardEvent } from "react";
import { ROOT_KEY } from "@/components/manuscript/tree-config";

interface TreeKeyActions {
  toggle: (id: string, collapse?: boolean) => void;
  startRename: (id: string) => void;
}

/**
 * Keyboard support for the tree, attached to the tree element. Arrow keys move focus between visible rows, Left and
 * Right collapse and expand, Enter opens a scene or the book view, or toggles a parent, F2 renames. Keys pressed inside the row's own
 * controls (grip, menu, rename input) are ignored: only the treeitem itself drives the tree.
 */
export function handleTreeKeyDown(e: KeyboardEvent<HTMLElement>, { toggle, startRename }: TreeKeyActions) {
  const target = e.target as HTMLElement;
  if (target.getAttribute("role") !== "treeitem") return;
  const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'));
  const i = items.indexOf(target);
  const nodeId = target.dataset.nodeId;
  const expanded = target.getAttribute("aria-expanded");

  switch (e.key) {
    case "F2":
      if (nodeId && nodeId !== ROOT_KEY) startRename(nodeId);
      break;
    case "ArrowDown":
      items[i + 1]?.focus();
      break;
    case "ArrowUp":
      items[i - 1]?.focus();
      break;
    case "ArrowRight":
      if (nodeId && expanded === "false") toggle(nodeId, false);
      else if (expanded === "true") items[i + 1]?.focus();
      break;
    case "ArrowLeft":
      if (nodeId && expanded === "true") toggle(nodeId, true);
      else
        target
          .closest('[role="group"]')
          ?.parentElement?.querySelector<HTMLElement>(':scope > [role="treeitem"]')
          ?.focus();
      break;
    case "Enter":
    case " ":
      if (target.dataset.kind === "book") {
        if (e.key === " ") return;
        target.click();
      } else if (target.dataset.kind === "scene") {
        if (e.key === " ") return;
        target.querySelector<HTMLAnchorElement>("a")?.click();
      } else if (nodeId) toggle(nodeId);
      else return;
      break;
    default:
      return;
  }
  e.preventDefault();
}
