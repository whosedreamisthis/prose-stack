import { Extension } from "@tiptap/core";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { isMisspelled, loadSpellEngineSoon, subscribeSpell } from "@/lib/spell-engine";
import { findWords, shouldSkip } from "@/lib/spellcheck";

interface SpellState {
  enabled: boolean;
  decorations: DecorationSet;
}

type SpellMeta = Partial<SpellState>;

export const spellKey = new PluginKey<SpellState>("spellcheck");

/** How long typing has to pause before the text is rescanned. */
const RESCAN_DELAY_MS = 350;

/** The text of a textblock with one character per document position, so a text offset is a position offset. */
export function blockText(block: PMNode): string {
  let text = "";
  block.forEach((child) => {
    text += child.isText ? child.text : " ".repeat(child.nodeSize);
  });
  return text;
}

/** Underlines every misspelled word, except the one the caret is still typing. */
function scan(view: EditorView): DecorationSet {
  const { doc, selection } = view.state;
  const typing = view.hasFocus() && selection.empty ? selection.from : -1;
  const found: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const start = pos + 1;
    for (const { from, to, word } of findWords(blockText(node))) {
      if (shouldSkip(word) || !isMisspelled(word)) continue;
      if (typing >= start + from && typing <= start + to) continue;
      found.push(Decoration.inline(start + from, start + to, { class: "spell-error" }));
    }
    return false;
  });
  return DecorationSet.create(doc, found);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    spellcheck: {
      /** Turns the underlines on or off. The dictionary loads soon after it is first turned on (see loadSpellEngineSoon). */
      setSpellcheck: (enabled: boolean) => ReturnType;
    };
  }
}

export const Spellcheck = Extension.create({
  name: "spellcheck",

  addCommands() {
    return {
      setSpellcheck:
        (enabled) =>
        ({ tr, dispatch }) => {
          if (enabled) loadSpellEngineSoon();
          if (dispatch) dispatch(tr.setMeta(spellKey, { enabled } satisfies SpellMeta).setMeta("addToHistory", false));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SpellState>({
        key: spellKey,
        state: {
          init: () => ({ enabled: false, decorations: DecorationSet.empty }),
          apply(tr, value) {
            const meta = tr.getMeta(spellKey) as SpellMeta | undefined;
            const decorations = meta?.decorations ?? (tr.docChanged ? value.decorations.map(tr.mapping, tr.doc) : value.decorations);
            const enabled = meta?.enabled ?? value.enabled;
            return { enabled, decorations: enabled ? decorations : DecorationSet.empty };
          },
        },
        props: {
          decorations: (state) => spellKey.getState(state)?.decorations,
        },
        view(initialView) {
          let timer: ReturnType<typeof setTimeout> | undefined;
          let seen = { doc: initialView.state.doc, from: initialView.state.selection.from, enabled: false };

          function schedule(view: EditorView) {
            clearTimeout(timer);
            timer = setTimeout(() => {
              if (view.isDestroyed) return;
              const enabled = spellKey.getState(view.state)?.enabled ?? false;
              const decorations = enabled ? scan(view) : DecorationSet.empty;
              view.dispatch(view.state.tr.setMeta(spellKey, { decorations } satisfies SpellMeta).setMeta("addToHistory", false));
            }, RESCAN_DELAY_MS);
          }

          // A dictionary that finishes loading, or a word added or ignored, changes the answers.
          const unsubscribe = subscribeSpell(() => schedule(initialView));

          return {
            update(view) {
              const enabled = spellKey.getState(view.state)?.enabled ?? false;
              const current = { doc: view.state.doc, from: view.state.selection.from, enabled };
              const changed = current.doc !== seen.doc || current.from !== seen.from || current.enabled !== seen.enabled;
              seen = current;
              if (changed) schedule(view);
            },
            destroy() {
              clearTimeout(timer);
              unsubscribe();
            },
          };
        },
      }),
    ];
  },
});
