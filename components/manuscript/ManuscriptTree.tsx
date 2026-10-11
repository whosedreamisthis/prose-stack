"use client";

import {
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ComponentType,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookIcon,
  BookmarkIcon,
  BookOpenTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronsDownUpIcon,
  ChevronsUpDownIcon,
  FileTextIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { createNode, renameNode } from "@/actions/manuscript";
import { TitleEditor } from "@/components/manuscript/TitleEditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { nodeTitleSchema, type NodeType } from "@/lib/manuscript-config";
import { childrenOf, resolveActiveScene } from "@/lib/manuscript-tree";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { cn } from "@/lib/utils";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

const rowClass =
  "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

const ROOT_KEY = "root";

const iconClass = "size-4 shrink-0";

const TYPE_LABEL: Record<NodeType, string> = {
  PART: "part",
  CHAPTER: "chapter",
  SCENE: "scene",
};

/** The item's own icon; on hover or focus it swaps to a chevron showing what a click does (down = collapse, right = expand). */
function ToggleIcon({
  icon: Icon,
  expanded,
}: {
  icon: ComponentType<{ className?: string }>;
  expanded: boolean;
}) {
  const Chevron = expanded ? ChevronDownIcon : ChevronRightIcon;
  return (
    <span className="relative size-4 shrink-0" aria-hidden>
      <Icon
        className={cn(
          iconClass,
          "absolute inset-0 group-hover/row:opacity-0 group-focus-visible/row:opacity-0",
        )}
      />
      <Chevron
        className={cn(
          iconClass,
          "absolute inset-0 opacity-0 group-hover/row:opacity-100 group-focus-visible/row:opacity-100",
        )}
      />
    </span>
  );
}

/** The "…" menu at the right of a row. Hidden until the row is hovered or focused, or while the menu is open. */
function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground opacity-0 outline-none group-focus-within/item:opacity-100 group-hover/item:opacity-100 hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:opacity-100"
      >
        <MoreHorizontalIcon className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      {/* No focus return: a rename started from the menu must keep focus in its input. */}
      <DropdownMenuContent align="start" finalFocus={false} className="w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Placeholder until Trash & Archive ships: shown so the menu is complete, but disabled. */
function TrashItem() {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" disabled>
        <Trash2Icon /> Move to trash
      </DropdownMenuItem>
    </>
  );
}

function RenameItem({ onClick }: { onClick: () => void }) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <PencilIcon /> Rename
    </DropdownMenuItem>
  );
}

interface ManuscriptTreeProps {
  projectId: string;
  /** The book's title: the root row that collapses the whole tree. */
  title: string;
  nodes: ManuscriptNodeSummary[];
}

export function ManuscriptTree({
  projectId,
  title,
  nodes: serverNodes,
}: ManuscriptTreeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeRef = useRef<HTMLUListElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Renames show at once and roll back on their own if the server action fails or throws.
  const [nodes, applyRename] = useOptimistic(
    serverNodes,
    (state, change: { id: string; title: string }) =>
      state.map((n) =>
        n.id === change.id ? { ...n, title: change.title } : n,
      ),
  );
  const collapsed = useTreeStore((s) => s.collapsed);
  const toggle = useTreeStore((s) => s.toggle);
  const expandAll = useTreeStore((s) => s.expandAll);
  const collapseAll = useTreeStore((s) => s.collapseAll);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const rootCollapsed = !!collapsed[ROOT_KEY];
  const activeId = resolveActiveScene(
    nodes,
    searchParams.get("scene") ?? undefined,
  )?.id;

  function focusRow(id: string) {
    requestAnimationFrame(() =>
      treeRef.current
        ?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)
        ?.focus(),
    );
  }

  function finishRename(
    node: ManuscriptNodeSummary,
    value: string | null,
    refocus: boolean,
  ) {
    setEditingId(null);
    if (refocus) focusRow(node.id);
    if (value === null) return;
    const parsed = nodeTitleSchema.safeParse(value);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid title.");
      return;
    }
    if (parsed.data === node.title) return;
    startTransition(async () => {
      applyRename({ id: node.id, title: parsed.data });
      const result = await renameNode({
        projectId,
        nodeId: node.id,
        title: parsed.data,
      });
      if (!result.success) toast.error(result.error);
    });
  }

  function addNode(parentId: string | null, type: NodeType) {
    startTransition(async () => {
      const result = await createNode({ projectId, parentId, type });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toggle(ROOT_KEY, false);
      if (parentId) toggle(parentId, false);
      // Every new item starts in rename mode; a new scene also opens in the editor.
      setEditingId(result.data.id);
      if (type === "SCENE")
        router.push(
          `/projects/${projectId}/manuscript?scene=${result.data.id}`,
        );
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    const target = e.target as HTMLElement;
    if (target.getAttribute("role") !== "treeitem") return;
    const items = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]'),
    ).filter((el) => !el.closest('[role="group"][hidden]'));
    const i = items.indexOf(target);
    const nodeId = target.dataset.nodeId;
    const expanded = target.getAttribute("aria-expanded");
    switch (e.key) {
      case "F2":
        if (nodeId && nodeId !== ROOT_KEY) setEditingId(nodeId);
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
            ?.parentElement?.querySelector<HTMLElement>(
              ':scope > [role="treeitem"]',
            )
            ?.focus();
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
      const editing = editingId === node.id;
      const editor = editing && (
        <TitleEditor
          initial={node.title}
          label={`Rename ${TYPE_LABEL[node.type]}`}
          onDone={(value, refocus) => finishRename(node, value, refocus)}
        />
      );

      if (node.type === "SCENE") {
        const active = node.id === activeId;
        if (editing) {
          return (
            <li key={node.id} role="none">
              <div
                role="treeitem"
                aria-selected={active}
                data-node-id={node.id}
                className={cn(rowClass, active && "bg-accent")}
              >
                <FileTextIcon className={iconClass} aria-hidden />
                {editor}
              </div>
            </li>
          );
        }
        return (
          <li key={node.id} role="none" className="group/item relative">
            <Link
              href={`/projects/${projectId}/manuscript?scene=${node.id}`}
              role="treeitem"
              aria-current={active ? "page" : undefined}
              aria-selected={active}
              title={node.title}
              data-node-id={node.id}
              onClick={() => setDrawerOpen(false)}
              onDoubleClick={() => setEditingId(node.id)}
              className={cn(
                rowClass,
                "pr-8",
                active && "bg-accent font-medium text-primary",
              )}
            >
              <FileTextIcon className={iconClass} aria-hidden />
              <span className="truncate">{node.title}</span>
            </Link>
            <RowMenu label={`${node.title} options`}>
              <RenameItem onClick={() => setEditingId(node.id)} />
                <TrashItem />
            </RowMenu>
          </li>
        );
      }

      const isCollapsed = !!collapsed[node.id];
      return (
        <li key={node.id} role="none">
          <div className="group/item relative">
            <div
              role="treeitem"
              tabIndex={0}
              aria-expanded={!isCollapsed}
              aria-selected={false}
              title={node.title}
              data-node-id={node.id}
              onClick={() => toggle(node.id)}
              onDoubleClick={() => setEditingId(node.id)}
              className={cn(
                rowClass,
                "group/row cursor-pointer pr-8 select-none font-medium",
              )}
            >
              <ToggleIcon
                icon={node.type === "PART" ? LayersIcon : BookmarkIcon}
                expanded={!isCollapsed}
              />
              {editing ? (
                editor
              ) : (
                <span className="truncate">{node.title}</span>
              )}
            </div>
            {!editing && (
              <RowMenu label={`${node.title} options`}>
                {node.type === "CHAPTER" && (
                  <DropdownMenuItem onClick={() => addNode(node.id, "SCENE")}>
                    <PlusIcon /> Add scene
                  </DropdownMenuItem>
                )}
                {node.type === "PART" && (
                  <DropdownMenuItem onClick={() => addNode(node.id, "CHAPTER")}>
                    <PlusIcon /> Add chapter
                  </DropdownMenuItem>
                )}
                <RenameItem onClick={() => setEditingId(node.id)} />
                <TrashItem />
              </RowMenu>
            )}
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
      <ul
        ref={treeRef}
        role="tree"
        aria-label="Manuscript"
        onKeyDown={onKeyDown}
        className="flex flex-col gap-0.5"
      >
        <li role="none">
          <div className="group/item relative">
            <div
              role="treeitem"
              tabIndex={0}
              aria-expanded={!rootCollapsed}
              aria-selected={false}
              title={title}
              data-node-id={ROOT_KEY}
              onClick={() => toggle(ROOT_KEY)}
              className={cn(
                rowClass,
                "group/row cursor-pointer pr-8 select-none font-semibold",
              )}
            >
              <ToggleIcon icon={BookIcon} expanded={!rootCollapsed} />
              <span className="truncate">{title}</span>
            </div>
            <RowMenu label={`${title} options`}>
              <DropdownMenuItem onClick={() => addNode(null, "PART")}>
                <PlusIcon /> Add part
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => addNode(null, "CHAPTER")}>
                <PlusIcon /> Add chapter
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={expandAll}>
                <ChevronsUpDownIcon /> Expand all
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  collapseAll(
                    nodes.filter((n) => n.type !== "SCENE").map((n) => n.id),
                  )
                }
              >
                <ChevronsDownUpIcon /> Collapse all
              </DropdownMenuItem>
            </RowMenu>
          </div>
          <ul
            role="group"
            hidden={rootCollapsed}
            className="ml-3 border-l pl-1"
          >
            {renderChildren(null)}
          </ul>
        </li>
      </ul>
    </nav>
  );
}
