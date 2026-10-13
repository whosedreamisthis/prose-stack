"use client";

import { useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BookmarkIcon, CheckIcon, ClipboardCheckIcon, ChevronDownIcon, ChevronRightIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { toast } from "sonner";
import { DndContext, DragOverlay, useDroppable } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { createNode, renameNode, trashNode } from "@/actions/manuscript";
import { useProofreadStore } from "@/lib/stores/proofread-store";
import { setNodeLabel } from "@/actions/labels";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { AddItem, ExportItem, RenameItem, RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import { SceneSearch, SceneSearchResults, useSearching } from "@/components/manuscript/SceneSearch";
import { TreeRow } from "@/components/manuscript/TreeRow";
import { handleTreeKeyDown } from "@/components/manuscript/tree-keyboard";
import { NODE_ICON, ROOT_KEY, iconClass, treeRowClass } from "@/components/manuscript/tree-config";
import { noShift, useTreeDnd, type TreeChange } from "@/components/manuscript/useTreeDnd";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useLabelData } from "@/hooks/useLabelData";
import { requestEditorFocus } from "@/lib/editor-focus";
import { defaultNodeTitle, nodeTitleSchema, type NodeType } from "@/lib/manuscript-config";
import { applyMove, childrenOf, resolveActiveScene, subtreeIds } from "@/lib/manuscript-tree";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useOptimisticActive, usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { cn } from "@/lib/utils";
import type { LabelWithUsage } from "@/types/labels";
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
  /** The book's title, which names the whole-book PDF. */
  projectTitle: string;
  nodes: ManuscriptNodeSummary[];
  labels: LabelWithUsage[];
}

export function ManuscriptTree({ projectId, projectTitle, nodes: serverNodes, labels: serverLabels }: ManuscriptTreeProps) {
  const labels = useLabelData(serverLabels);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const onManuscriptPage = pathname === `/projects/${projectId}/manuscript`;
  // A chapter or part opened as book text (/manuscript/chapter/<id>, /manuscript/part/<id>) is the highlighted row.
  const openNodeId = pathname.match(new RegExp(`^/projects/${projectId}/manuscript/(?:chapter|part)/([^/]+)`))?.[1];
  const treeRef = useRef<HTMLUListElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<ManuscriptNodeSummary | null>(null);
  const [, startTransition] = useTransition();
  /** Rows added but not yet confirmed by the server, each resolving to whether the server created it. */
  const creating = useRef(new Map<string, Promise<boolean>>());
  /** Scenes just added whose names are still being typed. */
  const namingNewScene = useRef(new Set<string>());
  // Renames and moves show at once and roll back on their own if the server action fails or throws.
  const [nodes, applyChange] = useOptimistic(serverNodes, (state, change: TreeChange) =>
    change.kind === "rename"
      ? state.map((n) => (n.id === change.id ? { ...n, title: change.title } : n))
      : change.kind === "add"
        ? [...state, change.node]
        : change.kind === "trash"
          ? state.filter((n) => !subtreeIds(state, change.id).includes(n.id))
          : change.kind === "label"
            ? state.map((n) => (n.id === change.id ? { ...n, labelId: change.labelId } : n))
            : applyMove(state, change.plan),
  );
  const collapsed = useTreeStore((s) => s.collapsed);
  const toggle = useTreeStore((s) => s.toggle);
  const expandAll = useTreeStore((s) => s.expandAll);
  const collapseAll = useTreeStore((s) => s.collapseAll);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const setPending = usePendingNavStore((s) => s.setPending);
  const rootCollapsed = !!collapsed[ROOT_KEY];
  const searching = useSearching();

  const sceneParam = searchParams.get("scene");
  // The URL only changes once the new scene has rendered on the server, which can take a moment. A clicked scene is
  // highlighted straight away; the choice stops applying as soon as the URL moves on.
  const [clicked, setClicked] = useState<{ id: string; from: string | null } | null>(null);
  if (clicked && clicked.from !== sceneParam) setClicked(null);
  const pendingSceneId = usePendingNavStore((s) => s.pending.scene);
  const openId = clicked && clicked.from === sceneParam ? clicked.id : resolveActiveScene(nodes, sceneParam ?? undefined)?.id;
  // Only one sidebar item is highlighted at a time: a scene is highlighted while the manuscript is open, or from the
  // click that is taking us there, never while a character or place is the open page.
  const routedId = onManuscriptPage ? openId : (openNodeId ?? pendingSceneId ?? undefined);
  // A chapter or part just clicked is highlighted at once too, and a click in another list takes the highlight away.
  const activeId = useOptimisticActive(["node", "scene"], routedId ?? null) ?? undefined;

  function focusRow(id: string) {
    // Two frames: after a move the row is re-rendered (often under a new parent) before it can take focus.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => treeRef.current?.querySelector<HTMLElement>(`[data-node-id="${id}"]`)?.focus()),
    );
  }

  /** Puts the cursor in the open scene's editor; if the scene is still on its way, the editor takes focus when it mounts. */
  function focusEditorFor(sceneId: string) {
    const editor = useEditorStore.getState().editor;
    if (sceneId === openId && editor) requestAnimationFrame(() => editor.commands.focus("end"));
    else requestEditorFocus();
  }

  const dnd = useTreeDnd({ projectId, nodes, collapsed, rootCollapsed, toggle, applyChange, startTransition, focusRow });
  const dragNode = dnd.dragNode;
  const DragIcon = dragNode ? NODE_ICON[dragNode.type] : null;

  function finishRename(node: ManuscriptNodeSummary, value: string | null, refocus: boolean) {
    setEditingId(null);
    const wasNewScene = namingNewScene.current.delete(node.id);
    // A scene just added and named with Enter is ready to write in; any other rename returns to its row.
    if (refocus && wasNewScene && value !== null) focusEditorFor(node.id);
    else if (refocus) focusRow(node.id);
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
    // Finishing its name with Enter moves focus into the editor (see finishRename).
    if (type === "SCENE") namingNewScene.current.add(id);
    startTransition(async () => {
      applyChange({
        kind: "add",
        node: { id, parentId, type, title: defaultNodeTitle(type, sameType), position: childrenOf(nodes, parentId).length, wordCount: 0, labelId: null },
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
        // A new scene also opens in the editor, without taking focus: the writer is still typing its name in the sidebar.
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

  /** Puts a label on a row, or takes it off (null). It shows at once and goes back if the server refuses. */
  function labelNode(node: ManuscriptNodeSummary, labelId: string | null) {
    if (labelId === node.labelId) return;
    startTransition(async () => {
      applyChange({ kind: "label", id: node.id, labelId });
      // A row added a moment ago may not exist on the server yet; wait for it, and drop the change if it failed.
      if (!(await (creating.current.get(node.id) ?? true))) return;
      const result = await setNodeLabel({ projectId, nodeId: node.id, labelId });
      if (!result.success) toast.error(result.error);
    });
  }

  function nodeMenu(node: ManuscriptNodeSummary) {
    return (
      <RowMenu label={`${node.title} options`}>
        {node.type === "CHAPTER" && <AddItem label="Add scene" onClick={() => addNode(node.id, "SCENE")} />}
        {node.type === "PART" && <AddItem label="Add chapter" onClick={() => addNode(node.id, "CHAPTER")} />}
        <RenameItem onClick={() => setEditingId(node.id)} />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <BookmarkIcon /> Label
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {labels.map((label) => (
              <DropdownMenuItem key={label.id} onClick={() => labelNode(node, label.id)}>
                <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                <span className="truncate">{label.name}</span>
                {node.labelId === label.id && <CheckIcon className="ml-auto" aria-label="Current label" />}
              </DropdownMenuItem>
            ))}
            {labels.length === 0 && <p className="px-1.5 py-1 text-sm text-muted-foreground">No labels yet. Add some in Settings.</p>}
            {node.labelId && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => labelNode(node, null)}>No label</DropdownMenuItem>
              </>
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {node.type === "SCENE" && (
          <DropdownMenuItem
            onClick={() => {
              // Opens the scene if it is not open yet; its editor runs the check as soon as it is ready.
              useProofreadStore.getState().setRunOnOpen(node.id);
              router.push(`/projects/${projectId}/manuscript?scene=${node.id}`);
              setDrawerOpen(false);
            }}
          >
            <ClipboardCheckIcon /> Proofread
          </DropdownMenuItem>
        )}
        <ExportItem type="node" id={node.id} projectId={projectId} name={node.title} />
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
          label={labels.find((l) => l.id === node.labelId) ?? null}
          menu={nodeMenu(node)}
          onToggle={() => toggle(node.id)}
          onStartRename={() => setEditingId(node.id)}
          onFinishRename={(value, refocus) => finishRename(node, value, refocus)}
          onOpenNode={() => {
            if (!onManuscriptPage) setPending("section", "manuscript");
            setPending("node", node.id);
            router.push(`/projects/${projectId}/manuscript/${node.type.toLowerCase()}/${node.id}`);
            setDrawerOpen(false);
          }}
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
      <SceneSearch projectId={projectId} onManuscriptPage={pathname.startsWith(`/projects/${projectId}/manuscript`)} />
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
              // The book row stays while searching, opened so the results show under it.
              collapsed={rootCollapsed && !searching}
              dropActive={dnd.isDropTarget(ROOT_KEY)}
              onToggle={() => toggle(ROOT_KEY)}
              onOpen={() => {
                if (!onManuscriptPage) setPending("section", "manuscript");
                setPending("node", "full");
                router.push(`/projects/${projectId}/manuscript/full`);
                setDrawerOpen(false);
              }}
              menu={
                <RowMenu label={`${ROOT_LABEL} options`}>
                  <AddItem label="Add part" onClick={() => addNode(null, "PART")} />
                  <AddItem label="Add chapter" onClick={() => addNode(null, "CHAPTER")} />
                  <ExportItem type="book" id={projectId} projectId={projectId} name={projectTitle} />
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
              {searching ? (
                <SceneSearchResults
                  nodes={nodes}
                  labels={labels}
                  activeId={activeId}
                  hrefFor={(sceneId) => `/projects/${projectId}/manuscript?scene=${sceneId}`}
                  onOpenResult={(sceneId) => {
                    setClicked({ id: sceneId, from: sceneParam });
                    if (!onManuscriptPage) setPending("section", "manuscript");
                    if (sceneId !== activeId || !onManuscriptPage) setPending("scene", sceneId);
                    setDrawerOpen(false);
                  }}
                />
              ) : (
                renderRows(null)
              )}
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
