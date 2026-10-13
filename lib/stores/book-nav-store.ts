import { create } from "zustand";

export interface BookNav {
  current: number;
  total: number;
  contents: { title: string; page: number; kind: string }[];
  go: (page: number) => void;
}

interface BookNavStore {
  /** Set by the open book view so the shell's top bar can show its page controls; null when no book is open. */
  nav: BookNav | null;
  setNav: (nav: BookNav | null) => void;
}

export const useBookNavStore = create<BookNavStore>((set) => ({
  nav: null,
  setNav: (nav) => set({ nav }),
}));
