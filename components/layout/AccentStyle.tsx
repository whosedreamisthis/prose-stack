"use client";

import { useEffect, useRef } from "react";

/**
 * Renders the accent <style>. Next.js keeps the previous route's DOM hidden for fast back-navigation, and a hidden
 * <style> would keep applying after you leave the project. React tears down a hidden subtree's effects, so the
 * cleanup switches the stylesheet off and the effect switches it back on when the project is visible again.
 * Before hydration (a hard load) it has no media attribute, so it applies from the first paint.
 */
export function AccentStyle({ css }: { css: string }) {
  const ref = useRef<HTMLStyleElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.media = "all";
    return () => {
      el.media = "not all";
    };
  }, []);

  return <style ref={ref}>{css}</style>;
}
