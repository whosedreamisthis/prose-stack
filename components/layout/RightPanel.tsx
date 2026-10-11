"use client";

import { useEffect, type ReactNode } from "react";
import { useLayoutStore } from "@/lib/stores/layout-store";

/** Content for the right sidebar. `hideTitle` keeps the heading for screen readers only, for pages whose content already says what it is. Mounting it tells the shell this page has context, which enables the toggle. */
export function RightPanel({ title, hideTitle, children }: { title: string; hideTitle?: boolean; children: ReactNode }) {
  const setHasRightPanel = useLayoutStore((s) => s.setHasRightPanel);

  useEffect(() => {
    setHasRightPanel(true);
    return () => setHasRightPanel(false);
  }, [setHasRightPanel]);

  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className={hideTitle ? "sr-only" : "text-sm font-medium text-primary"}>{title}</h2>
      {children}
    </section>
  );
}
