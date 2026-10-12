import { cn } from "@/lib/utils";
import type { LabelItem } from "@/types/labels";

/** Picks one label to filter by, or all. Renders nothing until the project has a label. */
export function LabelFilter({
  labels,
  value,
  onChange,
  className,
}: {
  labels: LabelItem[];
  value: string | null;
  onChange: (labelId: string | null) => void;
  className?: string;
}) {
  if (labels.length === 0) return null;
  return (
    <select
      aria-label="Filter by label"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className={cn("h-8 min-w-0 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
    >
      <option value="">All labels</option>
      {labels.map((label) => (
        <option key={label.id} value={label.id}>
          {label.name}
        </option>
      ))}
    </select>
  );
}
