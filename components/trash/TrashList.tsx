"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2Icon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteItemPermanently, restoreItem } from "@/actions/trash";
import { ConfirmDeleteDialog } from "@/components/layout/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { KIND_ICON } from "@/components/trash/kind-icons";
import { itemParam } from "@/lib/trash-config";
import { formatItemDate } from "@/lib/format-date";
import type { TrashItem } from "@/types/trash";

/** The Trash page: what was moved to the trash, newest first, each with Restore and Delete permanently. */
export function TrashList({ projectId, items }: { projectId: string; items: TrashItem[] }) {
  // The row leaves at once; if the action fails the server's list comes back unchanged and so does the row.
  const [visible, removeRow] = useOptimistic(items, (rows, id: string) => rows.filter((r) => r.id !== id));
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<TrashItem | null>(null);

  const run = (item: TrashItem, action: typeof restoreItem, done: string) => {
    startTransition(async () => {
      removeRow(item.id);
      const result = await action({ projectId, kind: item.kind, id: item.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
    });
  };

  return (
    <section aria-label="Trash" className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Trash</h1>
        <p className="text-sm text-muted-foreground">
          Restore an item to bring it back, or delete it permanently. Nothing here is removed until you delete it.
        </p>
      </header>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">The trash is empty.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-3">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/projects/${projectId}/trash?item=${encodeURIComponent(itemParam(item.kind, item.id))}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.detail} · moved {formatItemDate(item.trashedAt)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => run(item, restoreItem, "Restored.")}>
                    <Undo2Icon /> Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(item)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon /> Delete permanently
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDeleteDialog
        target={
          confirming && {
            name: confirming.title,
            detail: confirming.detail.includes("inside") ? "along with everything inside it" : undefined,
          }
        }
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) run(confirming, deleteItemPermanently, "Deleted permanently.");
          setConfirming(null);
        }}
      />
    </section>
  );
}
