"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tab = "notes" | "plots" | "summary";
const TABS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "plots", label: "Plots" },
  { id: "summary", label: "Summary" },
];

interface DetailTabsProps {
  /** The accessible name of the tab list, e.g. "Scene details". */
  label: string;
  notes: ReactNode;
  plots: ReactNode;
  /** Left out where there is nothing to summarise (the whole book), which hides the tab. */
  summary?: ReactNode;
}

/** The Notes, Plots and Summary tabs of a right sidebar. Remount it to start on Notes again. */
export function DetailTabs({ label, notes, plots, summary }: DetailTabsProps) {
  const baseId = useId();
  const [tab, setTab] = useState<Tab>("notes");
  const tabs = TABS.filter((t) => t.id !== "summary" || summary !== undefined);

  return (
    <>
      <div role="tablist" aria-label={label} className="flex gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`}>
        {tab === "notes" ? notes : tab === "plots" ? plots : summary}
      </div>
    </>
  );
}
