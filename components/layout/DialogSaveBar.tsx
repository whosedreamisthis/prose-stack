"use client";

import { Button } from "@/components/ui/button";
import type { AutosaveStatus } from "@/hooks/useDialogAutosave";

interface DialogSaveBarProps {
  /** Nothing is shown before the first save or while a change waits for the pause in typing. */
  status: AutosaveStatus;
  onDone: () => void;
}

/** The foot of an autosaving dialog: whether the latest change is saved, and a Done button (the X does the same). */
export function DialogSaveBar({ status, onDone }: DialogSaveBarProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p role="status" className="text-xs text-muted-foreground">
        {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
      </p>
      <Button type="button" size="sm" onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
