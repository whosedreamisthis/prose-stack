"use client";

import { useEffect, useMemo } from "react";
import { usePlotStore } from "@/lib/stores/plot-store";
import type { PlotData } from "@/types/plot";

/**
 * The plot to show, given what the server just rendered. It is the shared store once the store holds this same server
 * data (so edits made anywhere show here), and the server data itself until then. New server data replaces the store,
 * edits and all, because by then the server has seen them.
 */
export function usePlotData(server: PlotData): PlotData {
  const sig = useMemo(() => JSON.stringify(server), [server]);
  const storeSig = usePlotStore((s) => s.sig);
  const lines = usePlotStore((s) => s.lines);
  const points = usePlotStore((s) => s.points);

  // Keyed on this render's data only, so two components that briefly hold different data cannot keep overwriting each other.
  useEffect(() => {
    if (usePlotStore.getState().sig !== sig) usePlotStore.getState().hydrate(server, sig);
  }, [server, sig]);

  return useMemo(() => (storeSig === sig ? { lines, points } : server), [storeSig, sig, lines, points, server]);
}
