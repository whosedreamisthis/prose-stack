import { Extension } from "@tiptap/core";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { ProofreadCategory } from "@/lib/proofread/config";

/** A suggestion's place in the text. The editor keeps these current as the writer edits, so they never point at moved text. */
export interface ProofreadMark {
  id: string;
  from: number;
  to: number;
  /** The flagged text when it was found; if the text there has changed since, the suggestion is out of date. */
  text: string;
  category: ProofreadCategory;
}

interface ProofreadState {
  marks: DecorationSet;
  active: string | null;
  hidden: ProofreadCategory[];
}

type ProofreadMeta = Partial<ProofreadState>;

export const proofreadKey = new PluginKey<ProofreadState>("proofread");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    proofread: {
      /** Underlines these suggestions, replacing any shown before. */
      setProofreadMarks: (marks: ProofreadMark[]) => ReturnType;
      removeProofreadMarks: (ids: string[]) => ReturnType;
      clearProofreadMarks: () => ReturnType;
      /** Draws one suggestion stronger than the rest (null for none). */
      setActiveProofread: (id: string | null) => ReturnType;
      /** Hides the underlines of these categories without forgetting them. */
      setProofreadHidden: (categories: ProofreadCategory[]) => ReturnType;
    };
  }
}

/** Where every suggestion is now, by id, with the text that is there. */
export function proofreadRanges(state: EditorState): Map<string, { from: number; to: number; text: string; valid: boolean }> {
  const found = new Map<string, { from: number; to: number; text: string; valid: boolean }>();
  const marks = proofreadKey.getState(state)?.marks;
  if (!marks) return found;
  for (const d of marks.find()) {
    const spec = d.spec as { id: string; text: string };
    const now = state.doc.textBetween(d.from, d.to, " ", " ");
    found.set(spec.id, { from: d.from, to: d.to, text: now, valid: now === spec.text });
  }
  return found;
}

export const Proofread = Extension.create({
  name: "proofread",

  addCommands() {
    const meta = (tr: Transaction, value: ProofreadMeta) =>
      tr.setMeta(proofreadKey, value).setMeta("addToHistory", false);

    return {
      setProofreadMarks:
        (marks) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            const decorations = marks.map((m) =>
              Decoration.inline(m.from, m.to, { class: "proofread-mark", "data-proofread": m.id }, { id: m.id, text: m.text, category: m.category }),
            );
            meta(tr, { marks: DecorationSet.create(tr.doc, decorations), active: null });
            dispatch(tr);
          }
          return true;
        },
      removeProofreadMarks:
        (ids) =>
        ({ tr, dispatch, state }) => {
          if (dispatch) {
            const current = proofreadKey.getState(state)?.marks ?? DecorationSet.empty;
            const gone = current.find(undefined, undefined, (spec) => ids.includes((spec as { id: string }).id));
            meta(tr, { marks: current.remove(gone) });
            dispatch(tr);
          }
          return true;
        },
      clearProofreadMarks:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            meta(tr, { marks: DecorationSet.empty, active: null });
            dispatch(tr);
          }
          return true;
        },
      setActiveProofread:
        (id) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            meta(tr, { active: id });
            dispatch(tr);
          }
          return true;
        },
      setProofreadHidden:
        (categories) =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            meta(tr, { hidden: categories });
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<ProofreadState>({
        key: proofreadKey,
        state: {
          init: () => ({ marks: DecorationSet.empty, active: null, hidden: [] }),
          apply(tr, value) {
            const next = tr.getMeta(proofreadKey) as ProofreadMeta | undefined;
            const marks = next?.marks ?? (tr.docChanged ? value.marks.map(tr.mapping, tr.doc) : value.marks);
            return { marks, active: next?.active !== undefined ? next.active : value.active, hidden: next?.hidden ?? value.hidden };
          },
        },
        props: {
          decorations(state) {
            const { marks, active, hidden } = proofreadKey.getState(state) ?? { marks: DecorationSet.empty, active: null, hidden: [] };
            if (!active && hidden.length === 0) return marks;
            const shown = marks
              .find()
              .filter((d) => !hidden.includes((d.spec as { category: ProofreadCategory }).category))
              .map((d) => {
                const spec = d.spec as { id: string };
                return spec.id === active
                  ? Decoration.inline(d.from, d.to, { class: "proofread-mark proofread-mark-active", "data-proofread": spec.id }, d.spec)
                  : d;
              });
            return DecorationSet.create(state.doc, shown);
          },
        },
      }),
    ];
  },
});
