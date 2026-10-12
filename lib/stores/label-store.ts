import { create } from "zustand";
import type { LabelWithUsage } from "@/types/labels";

interface LabelStore {
  labels: LabelWithUsage[];
  /** A signature of the server data the store was last filled from (see hooks/useLabelData.ts); null until then. */
  sig: string | null;
  hydrate: (labels: LabelWithUsage[], sig: string) => void;
  setLabels: (labels: LabelWithUsage[]) => void;
}

/**
 * The project's labels as the writer sees them: the server's labels plus the changes that have not come back yet. The
 * Labels tab, the outline's color bars and the plot cards all read it, so a change shows in every one of them at once.
 */
export const useLabelStore = create<LabelStore>((set) => ({
  labels: [],
  sig: null,
  hydrate: (labels, sig) => set({ labels, sig }),
  setLabels: (labels) => set({ labels }),
}));
