"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { DownloadIcon, Loader2Icon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EXPORT_FAILED, exportUrl, pdfFileName, type ExportType } from "@/lib/export-config";
import { cn } from "@/lib/utils";

/** Lets an item close the menu itself, for items that keep it open while they work. */
const CloseMenuContext = createContext<() => void>(() => {});

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/**
 * The "…" menu at the right of a row. It sits inside the row's treeitem, so its clicks must not reach the row's own
 * click and double-click handlers (React events bubble out of the menu's portal too).
 * Hidden until the row is hovered or focused, or while the menu is open.
 */
export function RowMenu({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <CloseMenuContext.Provider value={close}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={label}
        data-row-menu
        onClick={stop}
        onDoubleClick={stop}
        className={cn(
          "absolute top-1/2 right-1 grid size-6 [@media(pointer:coarse)]:size-8 -translate-y-1/2 place-items-center rounded text-muted-foreground opacity-0 pointer-coarse:opacity-100 outline-none group-focus-visible/item:opacity-100 group-has-[:focus-visible]/item:opacity-100 group-hover/item:opacity-100 hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:opacity-100",
          className,
        )}
      >
        <MoreHorizontalIcon className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      {/* No focus return: a rename started from the menu must keep focus in its input. */}
      <DropdownMenuContent align="start" finalFocus={false} onClick={stop} onDoubleClick={stop} className="w-44">
        {children}
      </DropdownMenuContent>
      </DropdownMenu>
    </CloseMenuContext.Provider>
  );
}

export function AddItem({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <PlusIcon /> {label}
    </DropdownMenuItem>
  );
}

export function RenameItem({ onClick }: { onClick: () => void }) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <PencilIcon /> Rename
    </DropdownMenuItem>
  );
}

/**
 * "Export as PDF": downloads the item from the export route. The menu stays open with a spinner while the file is
 * generated, then closes; a failure shows a toast.
 */
export function ExportItem({ type, id, projectId, name }: { type: ExportType; id: string; projectId: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const closeMenu = useContext(CloseMenuContext);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch(exportUrl(type, id, projectId));
      if (!response.ok) throw new Error(`Export failed (${response.status})`);
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName(name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error(EXPORT_FAILED);
    } finally {
      setBusy(false);
      closeMenu();
    }
  };

  return (
    <DropdownMenuItem closeOnClick={false} disabled={busy} onClick={run}>
      {busy ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />} Export as PDF
    </DropdownMenuItem>
  );
}

export function TrashItem({ onClick }: { onClick: () => void }) {
  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuItem variant="destructive" onClick={onClick}>
        <Trash2Icon /> Move to trash
      </DropdownMenuItem>
    </>
  );
}
