"use client";

import { useEffect, useMemo } from "react";
import { useLabelStore } from "@/lib/stores/label-store";
import type { LabelWithUsage } from "@/types/labels";

/**
 * The labels to show, given what the server just rendered: the shared store once it holds this same server data (so edits
 * made anywhere show here), and the server data itself until then. New server data replaces the store, edits and all.
 */
export function useLabelData(server: LabelWithUsage[]): LabelWithUsage[] {
  const sig = useMemo(() => JSON.stringify(server), [server]);
  const storeSig = useLabelStore((s) => s.sig);
  const labels = useLabelStore((s) => s.labels);

  // Keyed on this render's data only, so two components that briefly hold different data cannot keep overwriting each other.
  useEffect(() => {
    if (useLabelStore.getState().sig !== sig) useLabelStore.getState().hydrate(server, sig);
  }, [server, sig]);

  return storeSig === sig ? labels : server;
}
