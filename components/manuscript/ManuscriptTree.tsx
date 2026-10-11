"use client";

import { useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookIcon, BookOpenTextIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { createNode, renameNode } from "@/actions/manuscript";
import { AddItem, RenameItem, RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import { ToggleIcon, TreeRow } from "@/components/manuscript/TreeRow";
import { handleTreeKeyDown } from "@/components/manuscript/tree-keyboard";
import { NODE_ICON, ROOT_KEY, iconClass, rowClass, treeRowClass } from "@/components/manuscript/tree-config";
import { noShift, useTreeDnd, type TreeChange } from "@/components/manuscript/useTreeDnd";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { nodeTitleSchema, type NodeType } from "@/lib/manuscript-config";
import { applyMove, childrenOf, resolveActiveScene } from "@/lib/manuscript-tree";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { cn } from "@/lib/utils";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

interface BookRowProps {
  title: string;
  collapsed: boolean;
  dropActive: boolean;
  menu: ReactNode;
  onToggle: () => void;
  children: ReactNode;
}

/** The book (the project) as the tree's root: collapses everything below it, and takes drops that move an item out to the book. */
function BookRow({ title, collapsed, dropActive, menu, onToggle, children }: BookRowProps) {
  const groupId = useId();
  const { setNodeRef } = useDroppable({ id: ROOT_KEY });
  return (
    <li role="none">
      <div
        ref={setNodeRef}
        role="treeitem"
        tabIndex={0}
        aria-label={title}
        aria-selected={false}
        aria-expanded={!collapsed}
        aria-owns={collapsed ? undefined : groupId}
        title={title}
        data-node-id={ROOT_KEY}
        data-kind="parent"
        onClick={onToggle}
        className={cn(treeRowClass, "cursor-pointer pl-2 font-semibold select-none", dropActive && "ring-2 ring-primary")}
      >
        <ToggleIcon icon={BookIcon} expanded={!collapsed} />
        <span className="truncate">{title}</span>
        {menu}
      </div>
      {!collapsed && (
        <ul id={groupId} role="group" className="ml-3 border-l pl-1">
          {children}
        </ul>
      )}
    </li>
  );
}

interface ManuscriptTreeProps {
  projectId: string;
  /** The book's title: the root row that collapses the whole tree. */
  title: string;
  nodes: ManuscriptNodeSummary[];
}

export function ManuscriptTree({ projectId, title, nodes: serverNodes }: ManuscriptTreeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const treeRef = useRef<HTMLUListElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Renames and moves show at once and roll back on their own if the server action fails or throws.
  const [nodes, applyChange] = useOptimistic(serverNodes, (state, change: TreeChange) =>
    change.kind === "rename"
      ? state.map((n) => (n.id === change.id ? { ...n, title: change.title } : n))
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
    clicked && clicked.from === sceneParam ? clicked.id : resolveActiveScene(nodes, sceneParam ?? undefined)?.id;

  function focusRow(id: string) {
    // Two frames: after a move the row is re-rendered (often under a new parent) before it can take focus.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => treeRef.current?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)?.focus()),
    );
  }

  const dnd = useTreeDnd({ projectId, nodes, collapsed, rootCollapsed, toggle, applyChange, startTransition, focusRow });
  const dragNode = dnd.dragNode;
  const DragIcon = dragNode ? NODE_ICON[dragNode.type] : null;

  function finishRename(node: ManuscriptNodeSummary, value: string | null, refocus: boolean) {
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
      const result = await renameNode({ projectId, nodeId: node.id, title: parsed.data });
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
      if (type === "SCENE") router.push(`/projects/${projectId}/manuscript?scene=${result.data.id}`);
    });
  }

  function nodeMenu(node: ManuscriptNodeSummary) {
    return (
      <RowMenu label={`${node.title} options`}>
        {node.type === "CHAPTER" && <AddItem label="Add scene" onClick={() => addNode(node.id, "SCENE")} />}
        {node.type === "PART" && <AddItem label="Add chapter" onClick={() => addNode(node.id, "CHAPTER")} />}
        <RenameItem onClick={() => setEditingId(node.id)} />
        <TrashItem />
      </RowMenu>
    );
  }

  function renderRows(parentId: string | null): ReactNode {
    return childrenOf(nodes, parentId).map((node) => {
      const isScene = node.type === "SCENE";
      const isCollapsed = !!collapsed[node.id];
      return (
        <TreeRow
          key={node.id}
          node={node}
          href={`/projects/${projectId}/manuscript?scene=${node.id}`}
          active={node.id === activeId}
          collapsed={isCollapsed}
          editing={editingId === node.id}
          dropActive={dnd.isDropTarget(node.id)}
          menu={nodeMenu(node)}
          onToggle={() => toggle(node.id)}
          onStartRename={() => setEditingId(node.id)}
          onFinishRename={(value, refocus) => finishRename(node, value, refocus)}
          onOpen={() => {
            setClicked({ id: node.id, from: sceneParam });
            setDrawerOpen(false);
          }}
        >
          {!isScene && !isCollapsed && renderRows(node.id)}
        </TreeRow>
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
      <DndContext {...dnd.contextProps}>
        <SortableContext items={dnd.items} strategy={noShift}>
          <ul
            ref={treeRef}
            role="tree"
            aria-label="Manuscript"
            onKeyDown={(e) => handleTreeKeyDown(e, { toggle, startRename: setEditingId })}
            className="flex flex-col gap-0.5"
          >
            <BookRow
              title={title}
              collapsed={rootCollapsed}
              dropActive={dnd.isDropTarget(ROOT_KEY)}
              onToggle={() => toggle(ROOT_KEY)}
              menu={
                <RowMenu label={`${title} options`}>
                  <AddItem label="Add part" onClick={() => addNode(null, "PART")} />
                  <AddItem label="Add chapter" onClick={() => addNode(null, "CHAPTER")} />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={expandAll}>
                    <ChevronsUpDownIcon /> Expand all
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => collapseAll(nodes.filter((n) => n.type !== "SCENE").map((n) => n.id))}
                  >
                    <ChevronsDownUpIcon /> Collapse all
                  </DropdownMenuItem>
                </RowMenu>
              }
            >
              {renderRows(null)}
            </BookRow>
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={null}>
          {dragNode && DragIcon && (
            <div className="flex items-center gap-1.5 rounded-md bg-popover px-2 py-1.5 text-sm shadow-md ring-1 ring-foreground/10">
              <DragIcon className={iconClass} aria-hidden />
              <span className="truncate">{dragNode.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </nav>
  );
}
