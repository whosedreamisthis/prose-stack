"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, Trash2Icon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteItemPermanently, restoreItem, trashArchivedItem, unarchiveItem } from "@/actions/trash";
import { ConfirmDeleteDialog } from "@/components/layout/ConfirmDeleteDialog";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { DocView } from "@/components/trash/DocView";
import { Button } from "@/components/ui/button";
import type { HiddenView } from "@/types/trash";

interface HiddenItemViewProps {
  projectId: string;
  /** The page it was opened from, which decides the actions and where "Back" goes. */
  from: "trash" | "archive";
  view: HiddenView;
}

/**
 * A trashed or archived item shown as it is, read-only, under a bar that says where it is and offers what can be done with
 * it: from the Trash, Restore or Delete permanently; from the Archive, Restore or Move to trash.
 */
export function HiddenItemView({ projectId, from, view }: HiddenItemViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<"delete" | "trash" | null>(null);
  const listHref = `/projects/${projectId}/${from}`;
  const place = from === "trash" ? "the trash" : "the archive";

  const run = (action: () => Promise<{ success: true } | { success: false; error: string }>, done: string) => {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
      // The item is gone from here, so go back to the list it was in.
      router.replace(listHref);
    });
  };

  const archiveKind =
    view.kind === "character" || view.kind === "place" || view.kind === "researchFolder" || view.kind === "researchItem" ? view.kind : null;

  return (
    <article aria-label={`${view.title}, in ${place}`} className="flex flex-col">
      <div role="status" className="sticky top-0 z-10 flex flex-col items-start gap-2 border-b bg-muted px-4 py-2 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href={listHref} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeftIcon className="size-4" aria-hidden /> {from === "trash" ? "Trash" : "Archive"}
          </Link>
          <span>This {view.subtitle.split(/[ ·]/)[0].toLowerCase()} is in {place}. It is read-only here.</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() =>
              run(
                () =>
                  from === "trash"
                    ? restoreItem({ projectId, kind: view.kind, id: view.id })
                    : unarchiveItem({ projectId, kind: archiveKind ?? "character", id: view.id }),
                "Restored.",
              )
            }
          >
            <Undo2Icon /> Restore
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming(from === "trash" ? "delete" : "trash")}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2Icon /> {from === "trash" ? "Delete permanently" : "Move to trash"}
          </Button>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 p-4">
        <header className="flex flex-col gap-1">
          <h1 className="font-serif text-2xl font-semibold">{view.title}</h1>
          <p className="text-sm text-muted-foreground">{view.subtitle}</p>
        </header>
        {view.sections.length === 0 && <p className="text-sm text-muted-foreground italic">Nothing was written here.</p>}
        {view.sections.map((section, i) => (
          <section key={i} className="flex flex-col gap-1.5">
            {section.heading && <h2 className="text-sm font-medium text-primary">{section.heading}</h2>}
            {section.doc && <DocView doc={section.doc} />}
            {section.text !== undefined && !section.doc && (
              <p className="break-words whitespace-pre-wrap">
                {section.text || <span className="text-muted-foreground italic">Empty.</span>}
              </p>
            )}
          </section>
        ))}
      </div>

      <ConfirmDeleteDialog
        target={
          confirming === "delete"
            ? { name: view.title, detail: view.sections.length > 1 && view.kind === "node" ? "along with everything inside it" : undefined }
            : null
        }
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          setConfirming(null);
          run(() => deleteItemPermanently({ projectId, kind: view.kind, id: view.id }), "Deleted permanently.");
        }}
      />
      <ConfirmTrashDialog
        target={confirming === "trash" ? { kind: view.kind, name: view.title } : null}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          setConfirming(null);
          run(() => trashArchivedItem({ projectId, kind: archiveKind ?? "character", id: view.id }), "Moved to the trash.");
        }}
      />
    </article>
  );
}
