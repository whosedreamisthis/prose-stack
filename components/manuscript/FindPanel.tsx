"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findMatches, searchKey } from "@/lib/search-replace-extension";
import { useEditorStore } from "@/lib/stores/editor-store";

/** Brings the highlighted match into view once the decorations have rendered. */
function scrollToCurrentMatch(editor: Editor) {
  requestAnimationFrame(() => {
    editor.view.dom.querySelector(".search-match-current")?.scrollIntoView({ block: "center" });
  });
}

/** Find and replace for the open scene. Matches are highlighted in the text; Escape closes and returns to the editor. */
export function FindPanel({ editor }: { editor: Editor }) {
  const setFindOpen = useEditorStore((s) => s.setFindOpen);
  const findRef = useRef<HTMLInputElement>(null);
  // Opening with text selected searches for it.
  const [term, setTerm] = useState(() => {
    const { from, to, empty } = editor.state.selection;
    const selected = empty ? "" : editor.state.doc.textBetween(from, to, " ");
    return selected ? selected : "";
  });
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);

  const { count, current } = useEditorState({
    editor,
    selector: ({ editor }) => {
      const s = searchKey.getState(editor.state);
      const total = s ? findMatches(editor.state.doc, s.term, s.caseSensitive).length : 0;
      return { count: total, current: total === 0 ? 0 : Math.min(s?.current ?? 0, total - 1) };
    },
  });

  useEffect(() => {
    findRef.current?.focus();
    findRef.current?.select();
  }, []);

  useEffect(() => {
    editor.commands.setSearch(term, caseSensitive);
  }, [editor, term, caseSensitive]);

  // Closing clears the highlights.
  useEffect(() => () => void editor.commands.setSearch("", false), [editor]);

  function close() {
    setFindOpen(false);
    editor.commands.focus();
  }

  function go(step: 1 | -1) {
    if (count === 0) return;
    editor.commands.setSearchCurrent((current + step + count) % count);
    scrollToCurrentMatch(editor);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  const status = !term ? "" : count === 0 ? "No results" : `${current + 1} of ${count}`;

  return (
    <section
      aria-label="Find and replace"
      onKeyDown={onKeyDown}
      className="mx-auto mb-3 flex w-full max-w-2xl flex-col gap-2 rounded-lg border bg-popover p-2 text-sm"
    >
      <div className="flex items-center gap-2">
        <Input
          ref={findRef}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              go(e.shiftKey ? -1 : 1);
            }
          }}
          placeholder="Find"
          aria-label="Find"
          className="h-8 min-w-0 flex-1"
        />
        <p aria-live="polite" className="min-w-16 text-center text-xs text-muted-foreground">
          {status}
        </p>
        <Button variant="ghost" size="icon-sm" aria-label="Previous match" disabled={count === 0} onClick={() => go(-1)}>
          <ChevronUpIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Next match" disabled={count === 0} onClick={() => go(1)}>
          <ChevronDownIcon />
        </Button>
        <Button
          variant={caseSensitive ? "default" : "outline"}
          size="sm"
          title={caseSensitive ? "Match case: on" : "Match case: off"}
          aria-pressed={caseSensitive}
          aria-label="Match case"
          onClick={() => setCaseSensitive((v) => !v)}
        >
          Aa
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label="Close find and replace" onClick={close}>
          <XIcon />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="Replace with"
          aria-label="Replace with"
          className="h-8 min-w-0 flex-1"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={count === 0}
          onClick={() => {
            editor.commands.replaceCurrent(replacement);
            scrollToCurrentMatch(editor);
          }}
        >
          Replace
        </Button>
        <Button variant="outline" size="sm" disabled={count === 0} onClick={() => editor.commands.replaceAll(replacement)}>
          Replace all
        </Button>
      </div>
    </section>
  );
}
