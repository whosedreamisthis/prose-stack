"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";

/**
 * For the chapter, part and whole-book pages, which are routes of their own rather than a `?scene=`. Shows `fallback` from
 * the moment a scene, chapter, part or the book is clicked until its page has arrived (the URL changed), so the click is
 * answered at once instead of leaving this page up unchanged. A click on what is already open waits for nothing.
 */
export function PendingNodeSwitch({ fallback, children }: { fallback: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const node = usePendingNavStore((s) => s.pending.node);
  const scene = usePendingNavStore((s) => s.pending.scene);
  const visibleNode = usePendingNavStore((s) => s.visible.node);
  const visibleScene = usePendingNavStore((s) => s.visible.scene);
  const setPending = usePendingNavStore((s) => s.setPending);
  const waitingForNode = node !== null && !pathname.endsWith(`/${node}`) && visibleNode;
  // A scene click leaves this route for the manuscript page, so any wait for a scene is a wait for this page to go.
  const waitingForScene = scene !== null && visibleScene;

  useEffect(() => {
    setPending("node", null);
    setPending("scene", null);
  }, [pathname, setPending]);

  return waitingForNode || waitingForScene ? fallback : children;
}
