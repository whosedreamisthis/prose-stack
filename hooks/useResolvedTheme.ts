"use client";

import { useSyncExternalStore } from "react";
import type { ResolvedTheme } from "@/lib/theme-config";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const getSnapshot = (): ResolvedTheme => (document.documentElement.classList.contains("dark") ? "dark" : "light");
const getServerSnapshot = (): ResolvedTheme => "light";

/** The theme that is on <html> right now, including a live preview from the settings modal. */
export function useResolvedTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
