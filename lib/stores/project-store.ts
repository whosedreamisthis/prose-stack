import { create } from "zustand";

interface ProjectStore {
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
  isNewProjectOpen: boolean;
  setNewProjectOpen: (open: boolean) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  isNewProjectOpen: false,
  setNewProjectOpen: (open) => set({ isNewProjectOpen: open }),
}));
