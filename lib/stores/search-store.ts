import { create } from "zustand";
import type { SceneSearchData } from "@/lib/scene-search";

interface SearchStore {
  /** The project the query below was typed for; a different project starts with an empty search. */
  projectId: string | null;
  query: string;
  /** The latest answer for `query`; null until one arrives, and while the query is too short to search. */
  data: SceneSearchData | null;
  loading: boolean;
  error: string | null;
  /** Opens the search on `projectId`, clearing anything typed for another project. */
  attach: (projectId: string) => void;
  setQuery: (query: string) => void;
  setResult: (result: { data: SceneSearchData | null; error: string | null }) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

/** The scene search for this browser session. Not persisted: a reload starts with an empty search. */
export const useSearchStore = create<SearchStore>((set) => ({
  projectId: null,
  query: "",
  data: null,
  loading: false,
  error: null,
  attach: (projectId) =>
    set((s) => (s.projectId === projectId ? s : { projectId, query: "", data: null, loading: false, error: null })),
  setQuery: (query) => set({ query }),
  setResult: ({ data, error }) => set({ data, error, loading: false }),
  setLoading: (loading) => set({ loading }),
  clear: () => set({ query: "", data: null, loading: false, error: null }),
}));
