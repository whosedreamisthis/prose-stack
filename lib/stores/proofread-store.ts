import type { Editor } from "@tiptap/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ALL_CATEGORIES, type ProofreadCategory } from "@/lib/proofread/config";
import type { Suggestion } from "@/lib/proofread/types";

/** A suggestion with a little of the text around it, for the panel. Where it sits in the scene is kept by the editor. */
export interface ProofreadItem extends Suggestion {
  before: string;
  after: string;
}

export type ProofreadStatus = "idle" | "running" | "done" | "error";

interface ProofreadStore {
  status: ProofreadStatus;
  progress: { done: number; total: number };
  /** What was checked: the whole scene, or the selection. */
  scope: "scene" | "selection";
  items: ProofreadItem[];
  error: string | null;
  /** The scene changed while it was being checked, so some results were dropped. */
  changedDuringRun: boolean;
  /** Paragraphs too long to check, left out of the last run. */
  skipped: number;
  active: string | null;
  /** The categories shown (and underlined). Remembered in this browser. */
  categories: ProofreadCategory[];
  /** The scene editor being proofread: its panel shows there, and its underlines live there. One scene at a time. */
  owner: Editor | null;
  /** A scene whose editor should run Proofread as soon as it is open (set from the outline's menu). */
  runOnOpen: string | null;

  begin: (scope: "scene" | "selection", total: number, owner: Editor) => void;
  setProgress: (done: number) => void;
  finish: (items: ProofreadItem[], extra: { changedDuringRun: boolean; skipped: number }) => void;
  fail: (message: string) => void;
  reset: () => void;
  removeItems: (ids: string[]) => void;
  setActive: (id: string | null) => void;
  setCategories: (categories: ProofreadCategory[]) => void;
  setRunOnOpen: (sceneId: string | null) => void;
}

const empty = {
  status: "idle" as ProofreadStatus,
  progress: { done: 0, total: 0 },
  items: [] as ProofreadItem[],
  error: null,
  changedDuringRun: false,
  skipped: 0,
  active: null,
  owner: null as Editor | null,
};

export const useProofreadStore = create<ProofreadStore>()(
  persist(
    (set) => ({
      ...empty,
      scope: "scene",
      categories: ALL_CATEGORIES,
      runOnOpen: null,

      begin: (scope, total, owner) => set({ ...empty, scope, status: "running", progress: { done: 0, total }, owner }),
      setProgress: (done) => set((s) => ({ progress: { ...s.progress, done } })),
      finish: (items, extra) => set({ status: "done", items, changedDuringRun: extra.changedDuringRun, skipped: extra.skipped, active: null }),
      fail: (message) => set({ status: "error", error: message, items: [], active: null }),
      reset: () => set({ ...empty }),
      removeItems: (ids) => set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)), active: ids.includes(s.active ?? "") ? null : s.active })),
      setActive: (active) => set({ active }),
      setCategories: (categories) => set({ categories }),
      setRunOnOpen: (runOnOpen) => set({ runOnOpen }),
    }),
    {
      name: "prosestack-proofread",
      partialize: (s) => ({ categories: s.categories }),
      // Defaults render on the server and first client paint; saved values apply after mount, so hydration always matches.
      skipHydration: true,
    },
  ),
);
