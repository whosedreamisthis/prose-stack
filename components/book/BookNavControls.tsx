"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBookNavStore } from "@/lib/stores/book-nav-store";

/** The book view's page controls, shown in the project's top bar beside the sidebar toggles. Renders nothing outside the book. */
export function BookNavControls() {
  const nav = useBookNavStore((s) => s.nav);
  if (!nav) return null;
  const { current, total, contents, go } = nav;

  return (
    <div className="flex min-w-0 items-center gap-1 sm:gap-2">
      <Button variant="ghost" size="icon" aria-label="Previous page" disabled={current <= 1} onClick={() => go(current - 1)}>
        <ChevronLeftIcon />
      </Button>
      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span className="hidden sm:inline">Page</span>
        <input
          type="number"
          min={1}
          max={total}
          value={current}
          onChange={(e) => e.target.value && go(Number(e.target.value))}
          aria-label="Go to page"
          className="h-7 w-14 rounded-md border bg-background px-1 text-center text-foreground"
        />
        of {total}
      </label>
      <Button variant="ghost" size="icon" aria-label="Next page" disabled={current >= total} onClick={() => go(current + 1)}>
        <ChevronRightIcon />
      </Button>
      {contents.length > 0 && (
        <select
          aria-label="Go to chapter"
          value=""
          onChange={(e) => e.target.value && go(Number(e.target.value))}
          className="hidden h-7 max-w-40 rounded-md border bg-background px-2 text-sm sm:block"
        >
          <option value="">Go to…</option>
          {contents.map((c) => (
            <option key={`${c.kind}-${c.page}`} value={c.page}>
              {c.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
