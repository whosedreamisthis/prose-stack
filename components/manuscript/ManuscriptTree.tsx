"use client";

import {
  useId,
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
  GripVerticalIcon,
  LayersIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  type SortingStrategy,
} from "@dnd-kit/sortable";
import { createNode, moveNode, renameNode } from "@/actions/manuscript";
import { TitleEditor } from "@/components/manuscript/TitleEditor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { nodeTitleSchema, type NodeType } from "@/lib/manuscript-config";
import {
  applyMove,
  childrenOf,
  planMove,
  resolveActiveScene,
  resolveDrop,
  type MovePlan,
} from "@/lib/manuscript-tree";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { cn } from "@/lib/utils";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

const rowClass =
  "flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-accent focus:bg-accent focus-visible:ring-2 focus-visible:ring-ring";

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
        className="absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground opacity-0 outline-none group-has-[:focus-visible]/item:opacity-100 group-hover/item:opacity-100 hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:opacity-100"
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

type TreeChange =
  | { kind: "rename"; id: string; title: string }
  | { kind: "move"; plan: MovePlan };

const NODE_ICON: Record<NodeType, ComponentType<{ className?: string }>> = {
  PART: LayersIcon,
  CHAPTER: BookmarkIcon,
  SCENE: FileTextIcon,
};

/** Rows keep their place while dragging; the drop target is shown by a ring and the dragged item by the overlay. */
const noShift: SortingStrategy = () => null;

/** A row that can be reordered: the grip handle on its left starts a drag (pointer, or space/enter with the keyboard). */
function SortableItem({
  id,
  label,
  dropActive,
  children,
}: {
  id: string;
  label: string;
  dropActive: boolean;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/item relative rounded-md",
        isDragging && "opacity-40",
        dropActive && "ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        aria-label={`Reorder ${label}`}
        {...attributes}
        {...listeners}
        className="absolute top-1/2 left-0.5 z-10 grid size-5 -translate-y-1/2 cursor-grab touch-none place-items-center rounded text-muted-foreground opacity-0 outline-none group-has-[:focus-visible]/item:opacity-100 group-hover/item:opacity-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-3.5" aria-hidden />
      </button>
      {children}
    </div>
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
  const dndId = useId();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  // Renames and moves show at once and roll back on their own if the server action fails or throws.
  const [nodes, applyChange] = useOptimistic(
    serverNodes,
    (state, change: TreeChange) =>
      change.kind === "rename"
        ? state.map((n) =>
            n.id === change.id ? { ...n, title: change.title } : n,
          )
        : applyMove(state, change.plan),
  );
  const collapsed = useTreeStore((s) => s.collapsed);
  const toggle = useTreeStore((s) => s.toggle);
  const expandAll = useTreeStore((s) => s.expandAll);
  const collapseAll = useTreeStore((s) => s.collapseAll);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const rootCollapsed = !!collapsed[ROOT_KEY];
  const sceneParam = searchParams.get("scene");
  // The URL only changes once the new scene has rendered on the server, which can take a moment. A clicked scene is
  // highlighted straight away; the choice stops applying as soon as the URL moves on.
  const [clicked, setClicked] = useState<{ id: string; from: string | null } | null>(null);
  if (clicked && clicked.from !== sceneParam) setClicked(null);
  const activeId =
    clicked && clicked.from === sceneParam
      ? clicked.id
      : resolveActiveScene(nodes, sceneParam ?? undefined)?.id;

  function focusRow(id: string) {
    // Two frames: after a move the row is re-rendered (often under a new parent) before it can take focus.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        treeRef.current
          ?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)
          ?.focus(),
      ),
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
      applyChange({ kind: "rename", id: node.id, title: parsed.data });
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

  const titleOf = (id: string | number) =>
    nodes.find((n) => n.id === id)?.title ?? "item";
  const dragNode = nodes.find((n) => n.id === dragId);

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragId(null);
    setOverId(null);
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
      const result = await moveNode({
        projectId,
        nodeId,
        parentId: drop.parentId,
        index: drop.index,
      });
      if (!result.success) toast.error(result.error);
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
      const dropActive =
        dragId !== null &&
        overId === node.id &&
        dragId !== node.id &&
        !!resolveDrop(nodes, dragId, node.id);
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
                className={cn(rowClass, "pl-6", active && "bg-accent")}
              >
                <FileTextIcon className={iconClass} aria-hidden />
                {editor}
              </div>
            </li>
          );
        }
        return (
          <li key={node.id} role="none">
            <SortableItem
              id={node.id}
              label={node.title}
              dropActive={dropActive}
            >
              <Link
                href={`/projects/${projectId}/manuscript?scene=${node.id}`}
                role="treeitem"
                aria-current={active ? "page" : undefined}
                aria-selected={active}
                title={node.title}
                data-node-id={node.id}
                onClick={() => {
                  setClicked({ id: node.id, from: sceneParam });
                  setDrawerOpen(false);
                }}
                onDoubleClick={() => setEditingId(node.id)}
                className={cn(
                  rowClass,
                  "pr-8 pl-6",
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
            </SortableItem>
          </li>
        );
      }

      const isCollapsed = !!collapsed[node.id];
      return (
        <li key={node.id} role="none">
          <SortableItem id={node.id} label={node.title} dropActive={dropActive}>
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
                "group/row cursor-pointer pr-8 pl-6 select-none font-medium",
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
          </SortableItem>
          {!isCollapsed && (
            <ul role="group" className="ml-3 border-l pl-1">
              {renderChildren(node.id)}
            </ul>
          )}
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
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setDragId(String(active.id))}
        onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
        onDragEnd={handleDragEnd}
        onDragCancel={({ active }) => {
          setDragId(null);
          setOverId(null);
          focusRow(String(active.id));
        }}
        accessibility={{
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
            onDragCancel: ({ active }) =>
              `Dragging ${titleOf(active.id)} was cancelled.`,
          },
        }}
      >
        <SortableContext items={visibleIds()} strategy={noShift}>
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
                        nodes
                          .filter((n) => n.type !== "SCENE")
                          .map((n) => n.id),
                      )
                    }
                  >
                    <ChevronsDownUpIcon /> Collapse all
                  </DropdownMenuItem>
                </RowMenu>
              </div>
              {!rootCollapsed && (
                <ul role="group" className="ml-3 border-l pl-1">
                  {renderChildren(null)}
                </ul>
              )}
            </li>
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {dragNode && (
            <div className="flex items-center gap-1.5 rounded-md bg-popover px-2 py-1.5 text-sm shadow-md ring-1 ring-foreground/10">
              {(() => {
                const Icon = NODE_ICON[dragNode.type];
                return <Icon className={iconClass} aria-hidden />;
              })()}
              <span className="truncate">{dragNode.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </nav>
  );
}
