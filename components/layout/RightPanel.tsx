"use client";

import { useEffect, type ReactNode } from "react";
import { useLayoutStore } from "@/lib/stores/layout-store";

/** Content for the right sidebar. Mounting it tells the shell this page has context, which enables the toggle. */
export function RightPanel({ title, children }: { title: string; children: ReactNode }) {
  const setHasRightPanel = useLayoutStore((s) => s.setHasRightPanel);

  useEffect(() => {
    setHasRightPanel(true);
    return () => setHasRightPanel(false);
  }, [setHasRightPanel]);

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
