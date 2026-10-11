import { create } from "zustand";

interface TreeStore {
  /** Ids of collapsed parts and chapters. Per browser session: not persisted. */
  collapsed: Record<string, true>;
  toggle: (id: string, collapse?: boolean) => void;
  expandAll: () => void;
  collapseAll: (ids: string[]) => void;
}

export const useTreeStore = create<TreeStore>((set) => ({
  collapsed: {},
  toggle: (id, collapse) =>
    set((s) => {
      const shouldCollapse = collapse ?? !s.collapsed[id];
      const next = { ...s.collapsed };
      if (shouldCollapse) next[id] = true;
      else delete next[id];
      return { collapsed: next };
    }),
  expandAll: () => set({ collapsed: {} }),
  collapseAll: (ids) => set({ collapsed: Object.fromEntries(ids.map((id) => [id, true as const])) }),
}));
