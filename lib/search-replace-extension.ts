import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface SearchMatch {
  from: number;
  to: number;
}

interface SearchState {
  term: string;
  caseSensitive: boolean;
  /** Index of the highlighted match. */
  current: number;
}

export const searchKey = new PluginKey<SearchState>("searchReplace");

/** Matches within single text nodes, which covers words and phrases inside one formatting run. */
export function findMatches(doc: PMNode, term: string, caseSensitive: boolean): SearchMatch[] {
  if (!term) return [];
  const needle = caseSensitive ? term : term.toLowerCase();
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = caseSensitive ? node.text : node.text.toLowerCase();
    let at = haystack.indexOf(needle);
    while (at !== -1) {
      matches.push({ from: pos + at, to: pos + at + needle.length });
      at = haystack.indexOf(needle, at + needle.length);
    }
  });
  return matches;
}

/** Replaces every match in `tr`, back to front so earlier positions stay valid as the text changes length. */
export function replaceMatches<T extends { insertText: (text: string, from: number, to: number) => unknown }>(
  tr: T,
  matches: SearchMatch[],
  replacement: string,
) {
  for (const m of [...matches].reverse()) tr.insertText(replacement, m.from, m.to);
  return tr;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearch: (term: string, caseSensitive?: boolean) => ReturnType;
      setSearchCurrent: (index: number) => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
    };
  }
}

export const SearchReplace = Extension.create({
  name: "searchReplace",

  addCommands() {
    return {
      setSearch:
        (term, caseSensitive = false) =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(tr.setMeta(searchKey, { term, caseSensitive, current: 0 }));
          return true;
        },
      setSearchCurrent:
        (index) =>
        ({ tr, dispatch, state }) => {
          const s = searchKey.getState(state);
          if (dispatch && s) dispatch(tr.setMeta(searchKey, { ...s, current: index }));
          return true;
        },
      replaceCurrent:
        (replacement) =>
        ({ tr, dispatch, state }) => {
          const s = searchKey.getState(state);
          if (!s) return false;
          const matches = findMatches(state.doc, s.term, s.caseSensitive);
          const match = matches[s.current];
          if (!match) return false;
          if (dispatch) dispatch(tr.insertText(replacement, match.from, match.to));
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ tr, dispatch, state }) => {
          const s = searchKey.getState(state);
          if (!s) return false;
          const matches = findMatches(state.doc, s.term, s.caseSensitive);
          if (matches.length === 0) return false;
          if (dispatch) dispatch(replaceMatches(tr, matches, replacement));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => ({ term: "", caseSensitive: false, current: 0 }),
          apply(tr, value) {
            const meta = tr.getMeta(searchKey) as SearchState | undefined;
            return meta ?? value;
          },
        },
        props: {
          decorations(state) {
            const s = searchKey.getState(state);
            if (!s || !s.term) return DecorationSet.empty;
            const matches = findMatches(state.doc, s.term, s.caseSensitive);
            return DecorationSet.create(
              state.doc,
              matches.map((m, i) => Decoration.inline(m.from, m.to, { class: i === s.current ? "search-match search-match-current" : "search-match" })),
            );
          },
        },
      }),
    ];
  },
});
