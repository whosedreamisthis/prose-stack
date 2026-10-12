"use client";

import { useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDownIcon, ChevronRightIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { createNode, renameNode, trashNode } from "@/actions/manuscript";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { AddItem, RenameItem, RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import { TreeRow } from "@/components/manuscript/TreeRow";
import { handleTreeKeyDown } from "@/components/manuscript/tree-keyboard";
import { NODE_ICON, ROOT_KEY, iconClass, treeRowClass } from "@/components/manuscript/tree-config";
import { noShift, useTreeDnd, type TreeChange } from "@/components/manuscript/useTreeDnd";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { requestEditorFocus } from "@/lib/editor-focus";
import { defaultNodeTitle, nodeTitleSchema, type NodeType } from "@/lib/manuscript-config";
import { applyMove, childrenOf, resolveActiveScene, subtreeIds } from "@/lib/manuscript-tree";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { cn } from "@/lib/utils";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

/** The tree's root row is also the sidebar's Manuscript header; the book's own title is already in the navbar. */
const ROOT_LABEL = "Manuscript";

interface BookRowProps {
  title: string;
  collapsed: boolean;
  dropActive: boolean;
  menu: ReactNode;
  onToggle: () => void;
  onOpen: () => void;
  children: ReactNode;
}

/** The book (the project) as the tree's root: collapses everything below it, and takes drops that move an item out to the book. */
function BookRow({ title, collapsed, dropActive, menu, onToggle, onOpen, children }: BookRowProps) {
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
        data-kind="book"
        onClick={onOpen}
        className={cn(treeRowClass, "cursor-pointer pl-2 font-semibold text-primary select-none", dropActive && "ring-2 ring-primary")}
      >
        {/* Same disclosure chevron as the other sidebar sections; clicking it toggles, clicking the rest of the row opens the book view. */}
        <button
          type="button"
          tabIndex={-1}
          aria-label={collapsed ? "Expand book" : "Collapse book"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="grid shrink-0 place-items-center rounded"
        >
          {collapsed ? <ChevronRightIcon className={iconClass} aria-hidden /> : <ChevronDownIcon className={iconClass} aria-hidden />}
        </button>
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
  nodes: ManuscriptNodeSummary[];
}

export function ManuscriptTree({ projectId, nodes: serverNodes }: ManuscriptTreeProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const onManuscriptPage = usePathname() === `/projects/${projectId}/manuscript`;
  const treeRef = useRef<HTMLUListElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ManuscriptNodeSummary | null>(null);
  const [, startTransition] = useTransition();
  /** Rows added but not yet confirmed by the server, each resolving to whether the server created it. */
  const creating = useRef(new Map<string, Promise<boolean>>());
  // Renames and moves show at once and roll back on their own if the server action fails or throws.
  const [nodes, applyChange] = useOptimistic(serverNodes, (state, change: TreeChange) =>
    change.kind === "rename"
      ? state.map((n) => (n.id === change.id ? { ...n, title: change.title } : n))
      : change.kind === "add"
        ? [...state, change.node]
        : change.kind === "trash"
          ? state.filter((n) => !subtreeIds(state, change.id).includes(n.id))
          : applyMove(state, change.plan),
  );
  const collapsed = useTreeStore((s) => s.collapsed);
  const toggle = useTreeStore((s) => s.toggle);
  const expandAll = useTreeStore((s) => s.expandAll);
  const collapseAll = useTreeStore((s) => s.collapseAll);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const setPending = usePendingNavStore((s) => s.setPending);
  const rootCollapsed = !!collapsed[ROOT_KEY];

  const sceneParam = searchParams.get("scene");
  // The URL only changes once the new scene has rendered on the server, which can take a moment. A clicked scene is
  // highlighted straight away; the choice stops applying as soon as the URL moves on.
  const [clicked, setClicked] = useState<{ id: string; from: string | null } | null>(null);
  if (clicked && clicked.from !== sceneParam) setClicked(null);
  const pendingSceneId = usePendingNavStore((s) => s.pending.scene);
  const openId = clicked && clicked.from === sceneParam ? clicked.id : resolveActiveScene(nodes, sceneParam ?? undefined)?.id;
  // Only one sidebar item is highlighted at a time: a scene is highlighted while the manuscript is open, or from the
  // click that is taking us there, never while a character or place is the open page.
  const activeId = onManuscriptPage ? openId : (pendingSceneId ?? undefined);

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
      // A row added a moment ago may not exist on the server yet; wait for it, and drop the rename if it failed.
      if (!(await (creating.current.get(node.id) ?? true))) return;
      const result = await renameNode({ projectId, nodeId: node.id, title: parsed.data });
      if (!result.success) toast.error(result.error);
    });
  }

  function addNode(parentId: string | null, type: NodeType) {
    // The row appears in rename mode at once under an id of our own; the server confirms in the background.
    const id = crypto.randomUUID();
    const sameType = nodes.filter((n) => n.parentId === parentId && n.type === type).length;
    toggle(ROOT_KEY, false);
    if (parentId) toggle(parentId, false);
    setEditingId(id);
    startTransition(async () => {
      applyChange({
        kind: "add",
        node: { id, parentId, type, title: defaultNodeTitle(type, sameType), position: childrenOf(nodes, parentId).length, wordCount: 0 },
      });
      const created = createNode({ projectId, parentId, type, id });
      creating.current.set(
        id,
        created.then((r) => r.success),
      );
      const result = await created;
      creating.current.delete(id);
      if (!result.success) {
        toast.error(result.error);
        setEditingId((current) => (current === id ? null : current));
      } else if (type === "SCENE") {
        // A new scene also opens in the editor.
        requestEditorFocus();
        router.push(`/projects/${projectId}/manuscript?scene=${id}`);
      }
    });
  }

  function trashNodeAndChildren(node: ManuscriptNodeSummary) {
    const ids = subtreeIds(nodes, node.id);
    startTransition(async () => {
      applyChange({ kind: "trash", id: node.id });
      // A row added a moment ago may not exist on the server yet; wait for it, and give up if it failed.
      if (!(await (creating.current.get(node.id) ?? true))) return;
      const result = await trashNode({ projectId, nodeId: node.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Moved to the trash.");
      // The open scene went with it, so fall back to the first remaining scene.
      if (onManuscriptPage && openId && ids.includes(openId)) router.replace(`/projects/${projectId}/manuscript`);
    });
  }

  function nodeMenu(node: ManuscriptNodeSummary) {
    return (
      <RowMenu label={`${node.title} options`}>
        {node.type === "CHAPTER" && <AddItem label="Add scene" onClick={() => addNode(node.id, "SCENE")} />}
        {node.type === "PART" && <AddItem label="Add chapter" onClick={() => addNode(node.id, "CHAPTER")} />}
        <RenameItem onClick={() => setEditingId(node.id)} />
        <TrashItem onClick={() => setConfirming(node)} />
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
            requestEditorFocus();
            setClicked({ id: node.id, from: sceneParam });
            if (!onManuscriptPage) setPending("section", "manuscript");
            if (node.id !== activeId || !onManuscriptPage) setPending("scene", node.id);
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
              title={ROOT_LABEL}
              collapsed={rootCollapsed}
              dropActive={dnd.isDropTarget(ROOT_KEY)}
              onToggle={() => toggle(ROOT_KEY)}
              onOpen={() => {
                if (!onManuscriptPage) setPending("section", "manuscript");
                router.push(`/projects/${projectId}/manuscript/book`);
                setDrawerOpen(false);
              }}
              menu={
                <RowMenu label={`${ROOT_LABEL} options`}>
                  <AddItem label="Add part" onClick={() => addNode(null, "PART")} />
                  <AddItem label="Add chapter" onClick={() => addNode(null, "CHAPTER")} />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={expandAll}>
                    <ChevronsUpDownIcon /> Expand all
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => collapseAll(nodes.filter((n) => n.type !== "SCENE").map((n) => n.id))}>
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
      <ConfirmTrashDialog
        target={
          confirming && {
            kind: confirming.type.toLowerCase(),
            name: confirming.title,
            detail: confirming.type === "SCENE" ? undefined : "Everything inside it goes too.",
          }
        }
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) trashNodeAndChildren(confirming);
          setConfirming(null);
        }}
      />
    </nav>
  );
}
