import { create } from "zustand";
import type { Formatting } from "@/lib/project-config";

interface FormattingStore {
  /** The open project's saved formatting, published by the editor so the toolbar (another route slot) can show it. */
  projectId: string | null;
  saved: Formatting | null;
  setSaved: (projectId: string | null, saved: Formatting | null) => void;
  /** Formatting shown before it is saved: the settings modal's draft, or a toolbar size change that is saving. */
  preview: Partial<Formatting> | null;
  setPreview: (preview: Partial<Formatting> | null) => void;
}

export const useFormattingStore = create<FormattingStore>((set) => ({
  projectId: null,
  saved: null,
  setSaved: (projectId, saved) => set({ projectId, saved }),
  preview: null,
  setPreview: (preview) => set({ preview }),
}));

/** What to show now: the preview over the saved values. */
export function applyPreview(saved: Formatting, preview: Partial<Formatting> | null): Formatting {
  return { ...saved, ...preview };
}
