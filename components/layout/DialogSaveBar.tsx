"use client";

import { Button } from "@/components/ui/button";

interface DialogSaveBarProps {
  /** A change is waiting to be saved. */
  dirty: boolean;
  /** Nothing to save yet, e.g. a new note that is still empty: no status is shown. */
  empty?: boolean;
  onDone: () => void;
}

/** The foot of an autosaving dialog: whether the latest change is saved, and a Done button (the X does the same). */
export function DialogSaveBar({ dirty, empty, onDone }: DialogSaveBarProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p role="status" className="text-xs text-muted-foreground">
        {empty ? "" : dirty ? "Saving…" : "Saved"}
      </p>
      <Button type="button" size="sm" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
