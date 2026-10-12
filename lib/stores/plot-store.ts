import { create } from "zustand";
import type { PlotData, PlotLineItem, PlotPointItem, PlotScene } from "@/types/plot";

interface PlotStore extends PlotData {
  /** A signature of the server data the store was last filled from (see hooks/usePlotData.ts); null until then. */
  sig: string | null;
  /** Scenes added from the grid whose outline has not arrived yet, so their rows show at once. Dropped on the next hydrate. */
  addedScenes: PlotScene[];
  hydrate: (data: PlotData, sig: string) => void;
  setLines: (lines: PlotLineItem[]) => void;
  setPoints: (points: PlotPointItem[]) => void;
  addScene: (scene: PlotScene) => void;
  removeScene: (id: string) => void;
}

/**
 * The plot board as the writer sees it: the server's plot plus the edits that have not come back yet. The grid, the Plots
 * section of the left sidebar and the scene sidebar all read it, so a change shows in every one of them at once. Each
 * change is applied here first, sent to the server, and put back if the server refuses.
 */
export const usePlotStore = create<PlotStore>((set) => ({
  lines: [],
  points: [],
  sig: null,
  addedScenes: [],
  hydrate: (data, sig) => set({ lines: data.lines, points: data.points, sig, addedScenes: [] }),
  setLines: (lines) => set({ lines }),
  setPoints: (points) => set({ points }),
  addScene: (scene) => set((s) => ({ addedScenes: [...s.addedScenes, scene] })),
  removeScene: (id) => set((s) => ({ addedScenes: s.addedScenes.filter((x) => x.id !== id) })),
}));
