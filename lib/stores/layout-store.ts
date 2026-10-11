import { create } from "zustand";

interface LayoutStore {
  leftOpen: boolean;
  rightOpen: boolean;
  /** Whether the current page supplies right-sidebar content. */
  hasRightPanel: boolean;
  /** The left sidebar as a drawer on small screens. */
  drawerOpen: boolean;
  toggleLeft: () => void;
  toggleRight: () => void;
  setHasRightPanel: (has: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
}

// Defaults are constants and the store is not persisted, so the server render and first client render always match.
export const useLayoutStore = create<LayoutStore>((set) => ({
  leftOpen: true,
  rightOpen: true,
  hasRightPanel: false,
  drawerOpen: false,
  toggleLeft: () => set((s) => ({ leftOpen: !s.leftOpen })),
  toggleRight: () => set((s) => ({ rightOpen: !s.rightOpen })),
  setHasRightPanel: (has) => set({ hasRightPanel: has }),
  setDrawerOpen: (open) => set({ drawerOpen: open }),
}));
