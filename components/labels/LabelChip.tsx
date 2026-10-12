import { BookmarkIcon } from "lucide-react";
import { Hint, ROW_HINT_DELAY_MS } from "@/components/layout/Hint";
import { cn } from "@/lib/utils";
import type { LabelItem } from "@/types/labels";

/** A label on a card: a bookmark icon and its name in its color. The name is text, so color is never the only cue. */
export function LabelChip({ label, className }: { label: LabelItem; className?: string }) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium", className)}
      style={{ color: label.color, borderColor: `${label.color}66`, backgroundColor: `${label.color}1a` }}
    >
      <BookmarkIcon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{label.name}</span>
    </span>
  );
}

/** The label's color as a small vertical bar, for a row of the outline. Its name is its hint and accessible name. */
export function LabelBar({ label, className }: { label: LabelItem; className?: string }) {
  return (
    // The wrapper is not positioned, so the bar's own absolute classes still place it against the row.
    <Hint label={label.name} side="right" delay={ROW_HINT_DELAY_MS}>
      <span
        role="img"
        aria-label={`Label: ${label.name}`}
        className={cn("h-4 w-1 shrink-0 rounded-full", className)}
        style={{ backgroundColor: label.color }}
      />
    </Hint>
  );
}
