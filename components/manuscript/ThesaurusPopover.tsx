"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { applySynonym, splitWord, wordRangeAt } from "@/lib/synonym";
import { useEditorStore } from "@/lib/stores/editor-store";

type Lookup = { status: "loading" } | { status: "ready"; words: string[] } | { status: "error" };

/** Words already looked up this session, so a repeat lookup is instant. */
const cache = new Map<string, string[]>();

interface Target {
  from: number;
  to: number;
  text: string;
  /** Where the popover sits: just under the word. */
  top: number;
  left: number;
}

/** The selected word, or the word the cursor is in. Null when there is none. */
function targetWord(editor: Editor): Target | null {
  const { selection, doc } = editor.state;
  let { from, to } = selection;
  if (selection.empty) {
    const $pos = selection.$from;
    const range = wordRangeAt($pos.parent.textContent, $pos.parentOffset);
    if (!range) return null;
    const start = $pos.start();
    from = start + range.from;
    to = start + range.to;
  }
  const text = doc.textBetween(from, to, " ");
  if (!/\p{L}/u.test(text) || /\s/.test(text.trim())) return null;
  const coords = editor.view.coordsAtPos(to);
  return { from, to, text, top: coords.bottom + 6, left: Math.max(8, coords.left) };
}

/** Synonyms for the word at the cursor, in a popover under it. Opens from the toolbar or Ctrl/Cmd+Shift+T. */
export function ThesaurusPopover({ editor }: { editor: Editor }) {
  const setOpen = useEditorStore((s) => s.setThesaurusOpen);
  const ref = useRef<HTMLDivElement>(null);
  // Fixed when the popover opens; the text under it does not change while it is up.
  const [target] = useState(() => targetWord(editor));
  const [fetched, setFetched] = useState<{ query: string; result: Lookup } | null>(null);
  const query = target ? splitWord(target.text).word : "";

  function close() {
    setOpen(false);
    editor.commands.focus();
  }

  const key = query.toLowerCase();
  const cached = cache.get(key);
  const lookup: Lookup = cached ? { status: "ready", words: cached } : fetched?.query === key ? fetched.result : { status: "loading" };

  useEffect(() => {
    if (!key || cache.has(key)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/thesaurus?word=${encodeURIComponent(key)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("lookup failed");
        const { words } = (await response.json()) as { words: string[] };
        cache.set(key, words);
        setFetched({ query: key, result: { status: "ready", words } });
      } catch {
        if (!controller.signal.aborted) setFetched({ query: key, result: { status: "error" } });
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  // Close on a click outside, and move focus into the popover once it has results.
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [setOpen]);

  const hasResults = lookup.status === "ready" && lookup.words.length > 0;
  useEffect(() => {
    if (hasResults) ref.current?.querySelector<HTMLElement>("button")?.focus();
  }, [hasResults]);

  function choose(synonym: string) {
    if (!target) return;
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.insertText(applySynonym(target.text, synonym), target.from, target.to);
        return true;
      })
      .run();
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button") ?? []);
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      e.preventDefault();
    }
  }

  let body: React.ReactNode;
  if (!target || !query) body = <p className="px-2 py-1.5 text-muted-foreground">Select a word first.</p>;
  else if (lookup.status === "loading") body = <p className="px-2 py-1.5 text-muted-foreground">Looking up “{query}”…</p>;
  else if (lookup.status === "error") body = <p className="px-2 py-1.5 text-destructive">Couldn&apos;t reach the thesaurus</p>;
  else if (lookup.words.length === 0) body = <p className="px-2 py-1.5 text-muted-foreground">No synonyms found</p>;
  else
    body = (
      <ul>
        {lookup.words.map((word) => (
          <li key={word}>
            <button
              type="button"
              onClick={() => choose(word)}
              className="w-full rounded-md px-2 py-1 text-left outline-none hover:bg-accent focus-visible:bg-accent"
            >
              {word}
            </button>
          </li>
        ))}
      </ul>
    );

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={query ? `Synonyms for ${query}` : "Thesaurus"}
      onKeyDown={onKeyDown}
      style={{ top: target?.top ?? 120, left: target?.left ?? 24 }}
      className="fixed z-50 max-h-64 w-52 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      <div aria-live="polite">{body}</div>
    </div>
  );
}
