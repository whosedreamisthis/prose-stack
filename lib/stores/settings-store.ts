import { create } from "zustand";
import { resetTab, type SettingsTab, type SettingsValues } from "@/lib/settings-config";

interface SettingsStore {
  open: boolean;
  projectId: string | null;
  tab: SettingsTab;
  /** The values when the modal opened; the draft is compared against them. */
  saved: SettingsValues | null;
  draft: SettingsValues | null;
  /** Whether a label was added, changed or deleted since the modal opened. Labels save as they change, so this only marks the tab. */
  labelsChanged: boolean;
  /** Opens the modal on the first tab with the draft as a fresh copy of the saved values. */
  openSettings: (projectId: string, saved: SettingsValues) => void;
  closeSettings: () => void;
  markLabelsChanged: () => void;
  setTab: (tab: SettingsTab) => void;
  updateDraft: (patch: Partial<SettingsValues>) => void;
  /** Records values that were saved, so a later partial failure leaves the draft compared against what is stored. */
  markSaved: (patch: Partial<SettingsValues>) => void;
  /** Puts one tab's settings back to their defaults in the draft; the writer still has to save. */
  resetDraftTab: (tab: SettingsTab) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  open: false,
  projectId: null,
  tab: "general",
  saved: null,
  draft: null,
  labelsChanged: false,
  openSettings: (projectId, saved) => set({ open: true, projectId, tab: "general", saved, draft: { ...saved }, labelsChanged: false }),
  closeSettings: () => set({ open: false }),
  markLabelsChanged: () => set({ labelsChanged: true }),
  setTab: (tab) => set({ tab }),
  updateDraft: (patch) => set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : s)),
  markSaved: (patch) => set((s) => (s.saved ? { saved: { ...s.saved, ...patch } } : s)),
  resetDraftTab: (tab) => set((s) => (s.draft ? { draft: resetTab(s.draft, tab) } : s)),
}));
