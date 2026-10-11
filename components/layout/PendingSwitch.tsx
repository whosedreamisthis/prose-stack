"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { usePendingNavStore, type PendingKind } from "@/lib/stores/pending-nav-store";

interface PendingSwitchProps {
  /** Which query parameter the click changes. */
  kind: PendingKind;
  fallback: ReactNode;
  children: ReactNode;
}

/**
 * Shows `fallback` from the moment another item is clicked until the server has rendered it. Without this the old item
 * stays on screen, unchanged, for the whole round trip, and the click looks ignored. The URL only moves to the new item
 * once its page is ready, so "clicked but URL not there yet" is exactly the waiting period.
 */
export function PendingSwitch({ kind, fallback, children }: PendingSwitchProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const requested = searchParams.get(kind);
  const search = searchParams.toString();
  const pendingId = usePendingNavStore((s) => s.pending[kind]);
  const setPending = usePendingNavStore((s) => s.setPending);
  const waiting = pendingId !== null && pendingId !== requested;

  // Any URL change means the navigation finished (or was replaced by another), so the wait is over either way.
  useEffect(() => {
    setPending(kind, null);
  }, [kind, pathname, search, setPending]);

  return waiting ? fallback : children;
}
