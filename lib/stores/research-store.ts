import { create } from "zustand";
import type { UploadKind } from "@/lib/research-config";

/** An upload in flight: shown as a row in the tree until the server has the item. */
export interface PendingUpload {
  id: string;
  folderId: string | null;
  kind: UploadKind;
  name: string;
  /** 0 to 100. */
  progress: number;
  /** The upload to show as the selected row while it runs: the one that will open when the upload is done. */
  select: boolean;
}

interface ResearchStore {
  /** The folder or item whose name is being edited in the sidebar, if any. A new folder starts here so it can be named at once. */
  renamingId: string | null;
  setRenamingId: (id: string | null) => void;
  uploads: PendingUpload[];
  addUpload: (upload: PendingUpload) => void;
  setUploadProgress: (id: string, progress: number) => void;
  removeUpload: (id: string) => void;
}

/** Shared by the Research tree and the section header's menu, which adds folders and uploads from outside the tree. */
export const useResearchStore = create<ResearchStore>((set) => ({
  renamingId: null,
  setRenamingId: (renamingId) => set({ renamingId }),
  uploads: [],
  addUpload: (upload) => set((s) => ({ uploads: [...s.uploads, upload] })),
  setUploadProgress: (id, progress) =>
    set((s) => ({ uploads: s.uploads.map((u) => (u.id === id ? { ...u, progress: Math.max(0, Math.min(100, progress)) } : u)) })),
  removeUpload: (id) => set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),
}));
