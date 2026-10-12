"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Trash2Icon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteItemPermanently, restoreItem, trashArchivedItem, unarchiveItem } from "@/actions/trash";
import { ConfirmDeleteDialog } from "@/components/layout/ConfirmDeleteDialog";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { RowMenu } from "@/components/manuscript/RowMenu";
import { KIND_ICON } from "@/components/trash/kind-icons";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { itemParam } from "@/lib/trash-config";
import { cn } from "@/lib/utils";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";
import type { ArchiveItem, TrashItem } from "@/types/trash";

type Item = TrashItem | ArchiveItem;

interface HiddenItemsListProps {
  projectId: string;
  /** The page the items are managed on: "trash" or "archive". */
  slug: "trash" | "archive";
  items: Item[];
  empty: string;
}

/**
 * The Trash and Archive sections of the left sidebar: what is in them, listed like characters and places. A row opens the
 * item itself, read-only, on the Trash or Archive page; its "…" menu acts on it right here: a trashed item can be restored or deleted permanently, an archived one
 * restored or moved to the trash.
 */
export function HiddenItemsList({ projectId, slug, items, empty }: HiddenItemsListProps) {
  const router = useRouter();
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const setPending = usePendingNavStore((s) => s.setPending);
  // The row leaves at once; if the action fails the server's list comes back unchanged and so does the row.
  const [visible, removeRow] = useOptimistic(items, (rows, id: string) => rows.filter((r) => r.id !== id));
  const [, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState<TrashItem | null>(null);
  const [confirmingTrash, setConfirmingTrash] = useState<ArchiveItem | null>(null);
  const href = `/projects/${projectId}/${slug}`;
  // Only one sidebar item is highlighted at a time, so an item here counts as open only while its own page shows it.
  const onPage = usePathname() === href;
  const openItem = useSearchParams().get("item");

  const run = (item: Item, action: () => Promise<{ success: true } | { success: false; error: string }>, done: string) => {
    startTransition(async () => {
      removeRow(item.id);
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
    });
  };

  if (visible.length === 0) return <p className="px-2 py-1 text-sm text-muted-foreground">{empty}</p>;

  return (
    <>
      <ul aria-label={slug === "trash" ? "Trashed items" : "Archived items"} className="ml-3 flex flex-col border-l pl-1">
        {visible.map((item) => {
          const Icon = KIND_ICON[item.kind];
          const param = itemParam(item.kind, item.id);
          const itemHref = `${href}?item=${encodeURIComponent(param)}`;
          const open = onPage && openItem === param;
          return (
            <li key={`${item.kind}-${item.id}`} className="group/item relative">
              <Link
                href={itemHref}
                aria-current={open ? "true" : undefined}
                onPointerEnter={() => router.prefetch(itemHref)}
                onFocus={() => router.prefetch(itemHref)}
                onClick={() => {
                  // Show the skeleton straight away, but only for an item that is not already open.
                  if (!onPage) setPending("section", slug);
                  if (!open) setPending("item", param);
                  setDrawerOpen(false);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  open ? "bg-accent font-medium text-primary" : "text-foreground/80 hover:bg-muted/60",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.title}</span>
              </Link>
              <RowMenu label={`${item.title} options`}>
                {"trashedAt" in item ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => run(item, () => restoreItem({ projectId, kind: item.kind, id: item.id }), "Restored.")}
                    >
                      <Undo2Icon /> Restore
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(item)}>
                      <Trash2Icon /> Delete permanently
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => run(item, () => unarchiveItem({ projectId, kind: item.kind, id: item.id }), "Restored.")}
                    >
                      <Undo2Icon /> Restore
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => setConfirmingTrash(item)}>
                      <Trash2Icon /> Move to trash
                    </DropdownMenuItem>
                  </>
                )}
              </RowMenu>
            </li>
          );
        })}
      </ul>
      <ConfirmDeleteDialog
        target={
          confirmingDelete && {
            name: confirmingDelete.title,
            detail: confirmingDelete.detail.includes("inside") ? "along with everything inside it" : undefined,
          }
        }
        onCancel={() => setConfirmingDelete(null)}
        onConfirm={() => {
          const item = confirmingDelete;
          setConfirmingDelete(null);
          if (item) run(item, () => deleteItemPermanently({ projectId, kind: item.kind, id: item.id }), "Deleted permanently.");
        }}
      />
      <ConfirmTrashDialog
        target={confirmingTrash && { kind: confirmingTrash.kind, name: confirmingTrash.title }}
        onCancel={() => setConfirmingTrash(null)}
        onConfirm={() => {
          const item = confirmingTrash;
          setConfirmingTrash(null);
          if (item) run(item, () => trashArchivedItem({ projectId, kind: item.kind, id: item.id }), "Moved to the trash.");
        }}
      />
    </>
  );
}
