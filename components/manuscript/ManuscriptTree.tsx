"use client";

import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import { BookIcon, BookmarkIcon, BookOpenTextIcon, ChevronDownIcon, ChevronRightIcon, FileTextIcon, LayersIcon } from "lucide-react";
import { childrenOf, resolveActiveScene } from "@/lib/manuscript-tree";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { cn } from "@/lib/utils";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

const rowClass =
  "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

const ROOT_KEY = "root";

const iconClass = "size-4 shrink-0";

/** The item's own icon; on hover or focus it swaps to a chevron showing what a click does (down = collapse, right = expand). */
function ToggleIcon({ icon: Icon, expanded }: { icon: ComponentType<{ className?: string }>; expanded: boolean }) {
  const Chevron = expanded ? ChevronDownIcon : ChevronRightIcon;
  return (
    <span className="relative size-4 shrink-0" aria-hidden>
      <Icon className={cn(iconClass, "absolute inset-0 group-hover/row:opacity-0 group-focus-visible/row:opacity-0")} />
      <Chevron className={cn(iconClass, "absolute inset-0 opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100")} />
    </span>
  );
}

interface ManuscriptTreeProps {
  projectId: string;
  /** The book's title: the root row that collapses the whole tree. */
  title: string;
  nodes: ManuscriptNodeSummary[];
}

export function ManuscriptTree({ projectId, title, nodes }: ManuscriptTreeProps) {
  const searchParams = useSearchParams();
  const collapsed = useTreeStore((s) => s.collapsed);
  const toggle = useTreeStore((s) => s.toggle);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const rootCollapsed = !!collapsed[ROOT_KEY];
  const activeId = resolveActiveScene(nodes, searchParams.get("scene") ?? undefined)?.id;

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (target.getAttribute("role") !== "treeitem") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]')).filter(
      (el) => !el.closest('[role="group"][hidden]'),
    );
    const i = items.indexOf(target);
    const nodeId = target.dataset.nodeId;
    const expanded = target.getAttribute("aria-expanded");
    switch (e.key) {
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
        else target.closest('[role="group"]')?.parentElement?.querySelector<HTMLElement>(':scope > [role="treeitem"]')?.focus();
        break;
      case "Enter":
      case " ":
        if (nodeId && expanded !== null) toggle(nodeId);
        else return;
        break;
      default:
        return;
    }
    e.preventDefault();
  }

  function renderChildren(parentId: string | null) {
    return childrenOf(nodes, parentId).map((node) => {
      if (node.type === "SCENE") {
        const active = node.id === activeId;
        return (
          <li key={node.id} role="none">
            <Link
              href={`/projects/${projectId}/manuscript?scene=${node.id}`}
              role="treeitem"
              aria-current={active ? "page" : undefined}
              aria-selected={active}
              title={node.title}
              data-node-id={node.id}
              onClick={() => setDrawerOpen(false)}
              className={cn(rowClass, active && "bg-accent font-medium text-primary")}
            >
              <FileTextIcon className={iconClass} aria-hidden />
              <span className="truncate">{node.title}</span>
            </Link>
          </li>
        );
      }
      const isCollapsed = !!collapsed[node.id];
      return (
        <li key={node.id} role="none">
          <div
            role="treeitem"
            tabIndex={0}
            aria-expanded={!isCollapsed}
            aria-selected={false}
            title={node.title}
            data-node-id={node.id}
            onClick={() => toggle(node.id)}
            className={cn(rowClass, "group/row cursor-pointer select-none font-medium")}
          >
            <ToggleIcon icon={node.type === "PART" ? LayersIcon : BookmarkIcon} expanded={!isCollapsed} />
            <span className="truncate">{node.title}</span>
          </div>
          <ul role="group" hidden={isCollapsed} className="ml-3 border-l pl-1">
            {renderChildren(node.id)}
          </ul>
        </li>
      );
    });
  }

  return (
    <nav aria-label="Manuscript outline" className="flex flex-col gap-2">
      <Link
        href={`/projects/${projectId}/manuscript/book`}
        onClick={() => setDrawerOpen(false)}
        className={cn(rowClass, "text-muted-foreground")}
      >
        <BookOpenTextIcon className={iconClass} aria-hidden />
        Book view
      </Link>
      <ul role="tree" aria-label="Manuscript" onKeyDown={onKeyDown} className="flex flex-col gap-0.5">
        <li role="none">
          <div
            role="treeitem"
            tabIndex={0}
            aria-expanded={!rootCollapsed}
            aria-selected={false}
            title={title}
            data-node-id={ROOT_KEY}
            onClick={() => toggle(ROOT_KEY)}
            className={cn(rowClass, "group/row cursor-pointer select-none font-semibold")}
          >
            <ToggleIcon icon={BookIcon} expanded={!rootCollapsed} />
            <span className="truncate">{title}</span>
          </div>
          <ul role="group" hidden={rootCollapsed} className="ml-3 border-l pl-1">
            {renderChildren(null)}
          </ul>
        </li>
      </ul>
    </nav>
  );
}
