"use client";

import { RightPanel } from "@/components/layout/RightPanel";
import { cn } from "@/lib/utils";

const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/**
 * Placeholder for a notes panel. It is a RightPanel too, so the sidebar doesn't collapse while the real one loads. With
 * `tabs` it matches a scene, chapter or part panel: the Notes, Plots and Summary tab strip instead of a title.
 */
export function NotesSkeleton({ title = "Character details", tabs = false }: { title?: string; tabs?: boolean }) {
  return (
    <RightPanel title={title} hideTitle={tabs}>
      {tabs && (
        <div className="flex gap-1 border-b" aria-hidden>
          {["Notes", "Plots", "Summary"].map((label, i) => (
            <span
              key={label}
              className={cn("-mb-px border-b-2 px-2.5 py-1.5 text-sm font-medium", i === 0 ? "border-primary text-foreground" : "border-transparent text-muted-foreground")}
            >
              {label}
            </span>
          ))}
        </div>
      )}
      <div className={cn("flex flex-col gap-3", tabs && "pt-3")} role="status" aria-label="Loading notes">
        <div className={`${bar} h-7 w-20`} />
        <div className={`${bar} h-20`} />
        <div className={`${bar} h-20`} />
        <div className={`${bar} h-14`} />
      </div>
    </RightPanel>
  );
}
