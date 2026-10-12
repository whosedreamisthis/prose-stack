"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { plotLineNameSchema } from "@/lib/plot-config";
import type { PlotLineItem } from "@/types/plot";

interface RenamePlotLineDialogProps {
  /** The line being renamed (null closes the dialog). */
  line: PlotLineItem | null;
  onCancel: () => void;
  onSave: (name: string) => void;
}

/** Renames a plot line. Used from the grid's column menu and the sidebar's row menu. */
export function RenamePlotLineDialog({ line, onCancel, onSave }: RenamePlotLineDialogProps) {
  return (
    <Dialog open={line !== null} onOpenChange={(open) => !open && onCancel()}>
      {line && <RenameForm key={line.id} line={line} onCancel={onCancel} onSave={onSave} />}
    </Dialog>
  );
}

function RenameForm({ line, onCancel, onSave }: { line: PlotLineItem; onCancel: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(line.name);
  const parsed = plotLineNameSchema.safeParse(name);

  return (
    <DialogContent className="sm:max-w-sm">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!parsed.success) return;
          if (parsed.data !== line.name) onSave(parsed.data);
          onCancel();
        }}
      >
        <DialogTitle>Rename plot line</DialogTitle>
        <DialogDescription className="sr-only">Give the plot line a new name.</DialogDescription>
        <Input aria-label="Plot line name" autoFocus value={name} maxLength={60} onChange={(e) => setName(e.target.value)} onFocus={(e) => e.target.select()} />
        {!parsed.success && name.length > 0 && <p className="text-sm text-destructive">{parsed.error.issues[0]?.message}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!parsed.success}>
            Save
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
