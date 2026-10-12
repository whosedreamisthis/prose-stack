"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderIcon,
  FolderInputIcon,
  FileIcon,
  FolderPlusIcon,
  ImageIcon,
  LinkIcon,
  Loader2Icon,
  NotebookTextIcon,
  UploadIcon,
  type LucideIcon,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { Hint, ROW_HINT_DELAY_MS, ROW_HINT_WRAPPER } from "@/components/layout/Hint";
import { SELECTED_ROW } from "@/components/layout/sidebar-styles";
import { AddItem, ExportItem, RenameItem, RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import { TitleEditor } from "@/components/manuscript/TitleEditor";
import { useResearchTree, type ResearchTreeApi } from "@/components/research/useResearchTree";
import { useResearchUpload } from "@/hooks/useResearchUpload";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from "@/components/ui/dropdown-menu";
import {
  RESEARCH_ROOT_DROP_ID,
  childFolders,
  folderDragId,
  folderItems,
  folderMoveError,
  itemDragId,
  parseDragId,
  resolveResearchDrop,
} from "@/lib/research-tree";
import { useOptimisticActive } from "@/lib/stores/pending-nav-store";
import { useResearchStore, type PendingUpload } from "@/lib/stores/research-store";
import { useTreeStore } from "@/lib/stores/tree-store";
import { cn } from "@/lib/utils";
import type { ResearchFolderSummary, ResearchItemSummary, ResearchLibrary } from "@/types/research";

const ITEM_ICON: Record<ResearchItemSummary["type"], LucideIcon> = {
  NOTE: NotebookTextIcon,
  LINK: LinkIcon,
  IMAGE: ImageIcon,
  FILE: FileIcon,
};
const ITEM_NOUN: Record<ResearchItemSummary["type"], string> = { NOTE: "note", LINK: "link", IMAGE: "image", FILE: "file" };
const rowClass =
  "group/row relative flex min-w-0 items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
/** Indents the "Move to…" list by folder depth (up to the nesting limit). */
const MOVE_INDENT = ["pl-2", "pl-5", "pl-8", "pl-11", "pl-14"];
const collapseKey = (folderId: string) => `research:${folderId}`;

type Hiding = { kind: "folder" | "item"; id: string; name: string } | null;

interface ResearchTreeProps {
  projectId: string;
  library: ResearchLibrary;
}

/** The Research section of the left sidebar: nested folders and their notes and links, with drag and drop and a menu per row. */
export function ResearchTree({ projectId, library: serverLibrary }: ResearchTreeProps) {
  const tree = useResearchTree(projectId, serverLibrary);
  const upload = useResearchUpload(projectId);
  const uploading = useResearchStore((st) => st.uploads);
  const { folders, items } = tree.library;
  const editing = useResearchStore((st) => st.renamingId);
  const setEditing = useResearchStore((st) => st.setRenamingId);
  const [hiding, setHiding] = useState<Hiding>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const optimisticId = useOptimisticActive(["item"], tree.openId);
  // An upload on its way is the selected row; the note or link that was open stops looking selected.
  const selectedId = uploading.some((u) => u.select) ? null : optimisticId;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragId(null);
    setOverId(null);
    if (!over) return;
    const drop = resolveResearchDrop(folders, items, String(active.id), String(over.id));
    const dragged = parseDragId(String(active.id));
    if (!drop || !dragged || dragged.kind === "root") return;
    if (dragged.kind === "folder") {
      const folder = folders.find((f) => f.id === dragged.id);
      if (
        folder &&
        (folder.parentId !== drop.parentId || childFolders(folders, drop.parentId).findIndex((f) => f.id === folder.id) !== drop.index)
      ) {
        tree.moveFolder(dragged.id, drop.parentId, drop.index);
      }
    } else {
      const item = items.find((i) => i.id === dragged.id);
      if (
        item &&
        (item.folderId !== drop.parentId || folderItems(items, drop.parentId).findIndex((i) => i.id === item.id) !== drop.index)
      ) {
        tree.moveItem(dragged.id, drop.parentId, drop.index);
      }
    }
  };

  const isDropTarget = (id: string) => dragId !== null && overId === id && !!resolveResearchDrop(folders, items, dragId, id);
  const dragged = dragId ? parseDragId(dragId) : null;
  const draggedLabel =
    dragged?.kind === "folder"
      ? folders.find((f) => f.id === dragged.id)?.name
      : dragged?.kind === "item"
        ? items.find((i) => i.id === dragged.id)?.title
        : null;

  if (folders.length === 0 && items.length === 0 && uploading.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 px-2 py-1">
        <p className="text-sm text-muted-foreground">No research yet. Use the … above to add a note, link, upload or folder.</p>
        <Button variant="outline" size="sm" onClick={tree.addStarterFolders}>
          <FolderPlusIcon /> Add starter folders
        </Button>
      </div>
    );
  }

  const ctx: RowContext = {
    projectId,
    tree,
    editing,
    setEditing,
    setHiding,
    selectedId,
    isDropTarget,
    upload,
    uploading,
  };

  return (
    <nav aria-label="Research" className="flex flex-col gap-1">
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => setDragId(String(active.id))}
        onDragOver={({ over }) => setOverId(over ? String(over.id) : null)}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setDragId(null);
          setOverId(null);
        }}
      >
        <ul className="ml-3 flex flex-col border-l pl-1">
          <Level ctx={ctx} parentId={null} />
        </ul>
        {dragId && <RootDropZone active={isDropTarget(RESEARCH_ROOT_DROP_ID)} />}
        <DragOverlay dropAnimation={null}>
          {draggedLabel && (
            <div className="flex items-center gap-1.5 rounded-md bg-popover px-2 py-1.5 text-sm shadow-md ring-1 ring-foreground/10">
              <span className="truncate">{draggedLabel}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
      <ConfirmTrashDialog
        target={
          hiding && {
            kind: hiding.kind === "folder" ? "folder" : "item",
            name: hiding.name,
            detail: hiding.kind === "folder" ? "Everything inside it goes too." : undefined,
          }
        }
        onCancel={() => setHiding(null)}
        onConfirm={() => {
          if (hiding?.kind === "folder") tree.hideFolder(hiding.id, "trash");
          else if (hiding) tree.hideItem(hiding.id, "trash");
          setHiding(null);
        }}
      />
    </nav>
  );
}

interface RowContext {
  projectId: string;
  tree: ResearchTreeApi;
  editing: string | null;
  setEditing: (id: string | null) => void;
  setHiding: (hiding: Hiding) => void;
  selectedId: string | null;
  isDropTarget: (dragId: string) => boolean;
  upload: ReturnType<typeof useResearchUpload>;
  uploading: PendingUpload[];
}

/** The folders, then the items, then the uploads still in flight, directly in one folder (or at the top level). */
function Level({ ctx, parentId }: { ctx: RowContext; parentId: string | null }) {
  const { folders, items } = ctx.tree.library;
  return (
    <>
      {childFolders(folders, parentId).map((folder) => (
        <FolderRow key={folder.id} ctx={ctx} folder={folder} />
      ))}
      {folderItems(items, parentId).map((item) => (
        <ItemRow key={item.id} ctx={ctx} item={item} />
      ))}
      {ctx.uploading
        .filter((u) => u.folderId === parentId)
        .map((u) => (
          <UploadingRow key={u.id} upload={u} />
        ))}
    </>
  );
}

/** A file on its way up: its name and progress, until the server has the item. */
function UploadingRow({ upload }: { upload: PendingUpload }) {
  return (
    <li className="relative" role="status" aria-label={`Uploading ${upload.name}, ${Math.round(upload.progress)}%`}>
      <div className={cn(rowClass, "pr-2", upload.select ? SELECTED_ROW : "text-muted-foreground")}>
        <Loader2Icon className="size-4 shrink-0 animate-spin" aria-hidden />
        <span className="truncate">{upload.name}</span>
        <span className="ml-auto shrink-0 text-xs tabular-nums">{Math.round(upload.progress)}%</span>
      </div>
      <div className="absolute inset-x-2 bottom-0 h-0.5 overflow-hidden rounded bg-muted" aria-hidden>
        <div className="h-full bg-primary transition-[width]" style={{ width: `${upload.progress}%` }} />
      </div>
    </li>
  );
}

function FolderRow({ ctx, folder }: { ctx: RowContext; folder: ResearchFolderSummary }) {
  const collapsed = useTreeStore((s) => !!s.collapsed[collapseKey(folder.id)]);
  const toggle = useTreeStore((s) => s.toggle);
  const editing = ctx.editing === folder.id;
  const [fileOver, setFileOver] = useState(false);
  // Drops land on the row's wrapper, not the whole entry, so the folder's contents stay separate targets.
  const { setNodeRef: setDropNode } = useDroppable({
    id: folderDragId(folder.id),
  });
  const { setNodeRef: setDragNode, attributes, listeners, isDragging } = useDraggable({ id: folderDragId(folder.id), disabled: editing });
  const Chevron = collapsed ? ChevronRightIcon : ChevronDownIcon;
  const groupId = useId();

  return (
    <li className="relative">
      <div
        ref={setDropNode}
        className={cn("group/item relative rounded-md", fileOver && "ring-2 ring-primary")}
        // Files dragged in from the desktop (not dnd-kit's rows) upload into this folder.
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setFileOver(true);
        }}
        onDragLeave={() => setFileOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setFileOver(false);
          toggle(collapseKey(folder.id), false);
          ctx.upload.drop([...e.dataTransfer.files], folder.id);
        }}
      >
        <Hint label={folder.name} side="right" delay={ROW_HINT_DELAY_MS} wrapperClassName={ROW_HINT_WRAPPER}>
        <div
          ref={setDragNode}
          // While renaming, the drag attributes would mark the row (and the input in it) disabled.
          {...(editing ? {} : attributes)}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          aria-controls={groupId}
          aria-label={folder.name}
          onClick={() => toggle(collapseKey(folder.id))}
          onDoubleClick={() => ctx.setEditing(folder.id)}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggle(collapseKey(folder.id));
            } else if (e.key === "F2") ctx.setEditing(folder.id);
          }}
          className={cn(
            rowClass,
            "cursor-pointer font-medium text-foreground/80 select-none hover:bg-muted/60",
            isDragging && "opacity-40",
            ctx.isDropTarget(folderDragId(folder.id)) && "ring-2 ring-primary",
          )}
        >
          <span className="relative size-4 shrink-0" aria-hidden>
            <FolderIcon className="absolute inset-0 size-4 group-hover/row:opacity-0" />
            <Chevron className="absolute inset-0 size-4 opacity-0 group-hover/row:opacity-100" />
          </span>
          {editing ? (
            <TitleEditor
              initial={folder.name}
              label="Rename folder"
              onDone={(value) => {
                ctx.setEditing(null);
                ctx.tree.renameFolder(folder.id, value, folder.name);
              }}
            />
          ) : (
            <span className="truncate">{folder.name}</span>
          )}
        </div>
        </Hint>
        {!editing && (
          <RowMenu label={`${folder.name} options`}>
            <AddItem label="Add note" onClick={() => ctx.tree.addItem(folder.id, "NOTE")} />
            <AddItem label="Add link" onClick={() => ctx.tree.addItem(folder.id, "LINK")} />
            <AddItem label="Add folder" onClick={() => ctx.setEditing(ctx.tree.addFolder(folder.id))} />
            <DropdownMenuItem onClick={() => void ctx.upload.choose("IMAGE", folder.id)}>
              <ImageIcon /> Upload image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void ctx.upload.choose("FILE", folder.id)}>
              <UploadIcon /> Upload file
            </DropdownMenuItem>
            <RenameItem onClick={() => ctx.setEditing(folder.id)} />
            <MoveToMenu ctx={ctx} kind="folder" id={folder.id} currentParent={folder.parentId} />
            <DropdownMenuItem onClick={() => ctx.tree.hideFolder(folder.id, "archive")}>
              <ArchiveIcon /> Archive
            </DropdownMenuItem>
            <TrashItem
              onClick={() =>
                ctx.setHiding({
                  kind: "folder",
                  id: folder.id,
                  name: folder.name,
                })
              }
            />
          </RowMenu>
        )}
      </div>
      {!collapsed && (
        <ul id={groupId} className="ml-3 flex flex-col border-l pl-1">
          <Level ctx={ctx} parentId={folder.id} />
        </ul>
      )}
    </li>
  );
}

function ItemRow({ ctx, item }: { ctx: RowContext; item: ResearchItemSummary }) {
  const router = useRouter();
  const editing = ctx.editing === item.id;
  const { setNodeRef: setDropNode } = useDroppable({ id: itemDragId(item.id) });
  const { setNodeRef: setDragNode, attributes, listeners, isDragging } = useDraggable({ id: itemDragId(item.id), disabled: editing });
  const Icon = ITEM_ICON[item.type];
  const href = `/projects/${ctx.projectId}/research?item=${item.id}`;
  const selected = item.id === ctx.selectedId;
  const className = cn(
    rowClass,
    selected ? SELECTED_ROW : "text-foreground/80 hover:bg-muted/60",
    isDragging && "opacity-40",
    ctx.isDropTarget(itemDragId(item.id)) && "ring-2 ring-primary",
  );

  return (
    <li ref={setDropNode} className="group/item relative">
      {editing ? (
        <div className={className}>
          <Icon className="size-4 shrink-0" aria-hidden />
          <TitleEditor
            initial={item.title}
            label={`Rename ${ITEM_NOUN[item.type]}`}
            onDone={(value) => {
              ctx.setEditing(null);
              ctx.tree.renameItem(item.id, value, item.title);
            }}
          />
        </div>
      ) : (
        <Hint label={item.title} side="right" delay={ROW_HINT_DELAY_MS} wrapperClassName={ROW_HINT_WRAPPER}>
        <Link
          ref={setDragNode}
          {...attributes}
          {...listeners}
          href={href}
          aria-current={selected ? "true" : undefined}
          onPointerEnter={() => router.prefetch(href)}
          onFocus={() => router.prefetch(href)}
          onClick={(e) => {
            e.preventDefault();
            ctx.tree.openItem(item.id);
          }}
          onDoubleClick={() => ctx.setEditing(item.id)}
          className={className}
        >
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{item.title}</span>
        </Link>
        </Hint>
      )}
      {!editing && (
        <RowMenu label={`${item.title} options`}>
          <RenameItem onClick={() => ctx.setEditing(item.id)} />
          <MoveToMenu ctx={ctx} kind="item" id={item.id} currentParent={item.folderId} />
          {item.type === "NOTE" && <ExportItem type="research" id={item.id} projectId={ctx.projectId} name={item.title} />}
          <DropdownMenuItem onClick={() => ctx.tree.hideItem(item.id, "archive")}>
            <ArchiveIcon /> Archive
          </DropdownMenuItem>
          <TrashItem onClick={() => ctx.setHiding({ kind: "item", id: item.id, name: item.title })} />
        </RowMenu>
      )}
    </li>
  );
}

/** "Move to…": the top level and every folder, indented; places a folder can't go are disabled. */
function MoveToMenu({
  ctx,
  kind,
  id,
  currentParent,
}: {
  ctx: RowContext;
  kind: "folder" | "item";
  id: string;
  currentParent: string | null;
}) {
  const { folders, items } = ctx.tree.library;
  const options: { id: string | null; name: string; depth: number }[] = [{ id: null, name: "Top level", depth: 0 }];
  const walk = (parentId: string | null, depth: number) => {
    for (const f of childFolders(folders, parentId)) {
      options.push({ id: f.id, name: f.name, depth });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 1);

  const allowed = (to: string | null) => to !== currentParent && (kind !== "folder" || !folderMoveError(folders, id, to));
  // Nowhere else to go (the only folder, already at the top level): offer nothing to pick from.
  if (!options.some((o) => allowed(o.id))) {
    return (
      <DropdownMenuItem disabled>
        <FolderInputIcon /> Move to…
      </DropdownMenuItem>
    );
  }

  const move = (to: string | null) => {
    if (kind === "folder") ctx.tree.moveFolder(id, to, childFolders(folders, to).filter((f) => f.id !== id).length);
    else ctx.tree.moveItem(id, to, folderItems(items, to).filter((i) => i.id !== id).length);
  };

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <FolderInputIcon /> Move to…
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-72 w-52 overflow-y-auto">
        {options.map((o) => {
          return (
            <DropdownMenuItem key={o.id ?? "top"} disabled={!allowed(o.id)} onClick={() => move(o.id)} className={MOVE_INDENT[o.depth]}>
              {o.id ? <FolderIcon /> : null}
              <span className="truncate">{o.name}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

/** Shown while dragging: drop here to move a folder or item out to the top level. */
function RootDropZone({ active }: { active: boolean }): ReactNode {
  const { setNodeRef } = useDroppable({ id: RESEARCH_ROOT_DROP_ID });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "ml-3 rounded-md border-2 border-dashed px-2 py-1.5 text-xs text-muted-foreground",
        active ? "border-primary text-foreground" : "border-border",
      )}
    >
      Drop here to move to the top level
    </div>
  );
}
