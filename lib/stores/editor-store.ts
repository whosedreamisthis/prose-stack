import type { Editor } from "@tiptap/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type SpeechState = "idle" | "speaking" | "paused";

export const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18] as const;

interface EditorStore {
  /** The open scene's editor, so the toolbar (a separate parallel-route slot) can drive it. */
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  saveStatus: SaveStatus;
  setSaveStatus: (status: SaveStatus) => void;
  /** Words in the open scene right now, ahead of what has been saved. */
  liveWords: number | null;
  setLiveWords: (words: number | null) => void;
  findOpen: boolean;
  setFindOpen: (open: boolean) => void;
  thesaurusOpen: boolean;
  setThesaurusOpen: (open: boolean) => void;
  speech: SpeechState;
  setSpeech: (state: SpeechState) => void;
  /** Writing-area font size in points. Remembered in this browser. */
  fontSize: number;
  setFontSize: (size: number) => void;
  /** Browser spell check on or off. Remembered in this browser. */
  spellcheck: boolean;
  toggleSpellcheck: () => void;
}

export const useEditorStore = create<EditorStore>()(
  persist(
    (set) => ({
      editor: null,
      setEditor: (editor) => set({ editor }),
      saveStatus: "idle",
      setSaveStatus: (saveStatus) => set({ saveStatus }),
      liveWords: null,
      setLiveWords: (liveWords) => set({ liveWords }),
      findOpen: false,
      setFindOpen: (findOpen) => set({ findOpen }),
      thesaurusOpen: false,
      setThesaurusOpen: (thesaurusOpen) => set({ thesaurusOpen }),
      speech: "idle",
      setSpeech: (speech) => set({ speech }),
      fontSize: 14,
      setFontSize: (fontSize) => set({ fontSize }),
      spellcheck: true,
      toggleSpellcheck: () => set((s) => ({ spellcheck: !s.spellcheck })),
    }),
    {
      name: "prosestack-editor",
      partialize: (s) => ({ fontSize: s.fontSize, spellcheck: s.spellcheck }),
      // Defaults render on the server and first client paint; saved values apply after mount, so hydration always matches.
      skipHydration: true,
    },
  ),
);
