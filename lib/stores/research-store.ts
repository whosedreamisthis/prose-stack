import { create } from "zustand";

interface ResearchStore {
  /** The folder or item whose name is being edited in the sidebar, if any. A new folder starts here so it can be named at once. */
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
}

/** Shared by the Research tree and the section header's menu, which adds folders from outside the tree. */
export const useResearchStore = create<ResearchStore>((set) => ({
  renamingId: null,
  setRenamingId: (renamingId) => set({ renamingId }),
}));
