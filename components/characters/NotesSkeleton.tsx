"use client";

import { RightPanel } from "@/components/layout/RightPanel";

const bar = "animate-pulse rounded-lg bg-muted motion-reduce:animate-none";

/** Placeholder for a notes panel (characters or places). It is a RightPanel too, so the sidebar doesn't collapse while the real one loads. */
export function NotesSkeleton({ title = "Character details" }: { title?: string }) {
  return (
    <RightPanel title={title}>
      <div className="flex flex-col gap-3" role="status" aria-label="Loading notes">
        <div className={`${bar} h-7 w-20`} />
        <div className={`${bar} h-20`} />
        <div className={`${bar} h-20`} />
        <div className={`${bar} h-14`} />
      </div>
    </RightPanel>
  );
}
