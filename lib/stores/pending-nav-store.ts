import { create } from "zustand";

/** What a click is waiting on: the `?character=` or `?scene=` item on a page, or a whole `section` (a route segment). */
export type PendingKind = "character" | "scene" | "section";

interface PendingNavStore {
  /** The item the writer just clicked, until the server has rendered it. Lets the page show a skeleton at once. */
  pending: Record<PendingKind, string | null>;
  setPending: (kind: PendingKind, id: string | null) => void;
}

export const usePendingNavStore = create<PendingNavStore>((set) => ({
  pending: { character: null, scene: null, section: null },
  setPending: (kind, id) => set((s) => ({ pending: { ...s.pending, [kind]: id } })),
}));
