"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Trash2Icon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { trashArchivedItem, unarchiveItem } from "@/actions/trash";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { KIND_ICON } from "@/components/trash/kind-icons";
import { Button } from "@/components/ui/button";
import { itemParam } from "@/lib/trash-config";
import { formatItemDate } from "@/lib/format-date";
import type { ArchiveItem } from "@/types/trash";

/** The Archive page: characters and places set aside, newest first, each with Restore and Move to trash. */
export function ArchiveList({ projectId, items }: { projectId: string; items: ArchiveItem[] }) {
  const [visible, removeRow] = useOptimistic(items, (rows, id: string) => rows.filter((r) => r.id !== id));
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<ArchiveItem | null>(null);

  const run = (item: ArchiveItem, action: typeof unarchiveItem, done: string) => {
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
    <section aria-label="Archive" className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Archive</h1>
        <p className="text-sm text-muted-foreground">
          Archived items are kept out of your lists but never lost. Restore one to bring it back.
        </p>
      </header>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nothing is archived.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => {
            const Icon = KIND_ICON[item.kind];
            return (
              <li key={`${item.kind}-${item.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card p-3">
                <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link
                    href={`/projects/${projectId}/archive?item=${encodeURIComponent(itemParam(item.kind, item.id))}`}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {item.title}
                  </Link>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.detail} · archived {formatItemDate(item.archivedAt)}
                  </span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button variant="outline" size="sm" onClick={() => run(item, unarchiveItem, "Restored.")}>
                    <Undo2Icon /> Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirming(item)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2Icon /> Move to trash
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmTrashDialog
        target={confirming && { kind: confirming.kind, name: confirming.title }}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          const item = confirming;
          setConfirming(null);
          if (item) run(item, trashArchivedItem, "Moved to the trash.");
        }}
      />
    </section>
  );
}
