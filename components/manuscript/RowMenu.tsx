"use client";

import type { ReactNode } from "react";
import { MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/**
 * The "…" menu at the right of a row. It sits inside the row's treeitem, so its clicks must not reach the row's own
 * click and double-click handlers (React events bubble out of the menu's portal too).
 * Hidden until the row is hovered or focused, or while the menu is open.
 */
export function RowMenu({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={label}
        data-row-menu
        onClick={stop}
        onDoubleClick={stop}
        className={cn(
          "absolute top-1/2 right-1 grid size-6 -translate-y-1/2 place-items-center rounded text-muted-foreground opacity-0 outline-none group-focus-visible/item:opacity-100 group-has-[:focus-visible]/item:opacity-100 group-hover/item:opacity-100 hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-popup-open:opacity-100",
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
