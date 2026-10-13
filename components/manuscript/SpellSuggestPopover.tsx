"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { addToDictionary, ignoreWord, suggestFor } from "@/lib/spell-engine";
import { matchCase } from "@/lib/spellcheck";

interface Target {
  from: number;
  to: number;
  word: string;
  suggestions: string[];
  /** Where the popover sits: just under the word. */
  top: number;
  left: number;
  /** Opened from the keyboard, so focus moves into the popover. */
  focus?: boolean;
}

/** How long the pointer rests on a word before the popover opens, and how long it may wander off before it closes. */
const OPEN_DELAY_MS = 250;
const CLOSE_DELAY_MS = 250;

/** The misspelled word under an element, if it is one. */
function targetFromElement(editor: Editor, el: Element | null): Target | null {
  const mark = el?.closest<HTMLElement>(".spell-error");
  if (!mark || !editor.view.dom.contains(mark)) return null;
  const word = mark.textContent ?? "";
  const from = editor.view.posAtDOM(mark, 0);
  const rect = mark.getBoundingClientRect();
  return { from, to: from + word.length, word, suggestions: suggestFor(word), top: rect.bottom + 4, left: Math.max(8, rect.left) };
}

/** The misspelled word at the caret, for the keyboard route in. */
function targetAtCaret(editor: Editor): Target | null {
  const { from } = editor.state.selection;
  const { node } = editor.view.domAtPos(from);
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  const mark = el?.closest(".spell-error") ?? el?.querySelector(".spell-error");
  return targetFromElement(editor, mark ?? null);
}

/**
 * Replacement options for a misspelled word, in a popover under it. Opens when the pointer rests on the underlined
 * word, or from the keyboard with Ctrl/Cmd+. while the caret is in it.
 */
export function SpellSuggestPopover({ editor }: { editor: Editor }) {
  const [target, setTarget] = useState<Target | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointerInside = useRef(false);

  useEffect(() => {
    const dom = editor.view.dom;

    function cancelOpen() {
      clearTimeout(openTimer.current);
    }
    function scheduleClose() {
      clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(() => {
        if (!pointerInside.current) setTarget(null);
      }, CLOSE_DELAY_MS);
    }
    function onMouseOver(e: MouseEvent) {
      const el = e.target instanceof Element ? e.target : null;
      if (!el?.closest(".spell-error")) {
        cancelOpen();
        return;
      }
      clearTimeout(closeTimer.current);
      cancelOpen();
      openTimer.current = setTimeout(() => setTarget(targetFromElement(editor, el)), OPEN_DELAY_MS);
    }
    function onMouseOut(e: MouseEvent) {
      if (!(e.target instanceof Element) || !e.target.closest(".spell-error")) return;
      cancelOpen();
      scheduleClose();
    }
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === ".") {
        const next = targetAtCaret(editor);
        if (!next) return;
        e.preventDefault();
        setTarget({ ...next, focus: true });
      } else if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
        // Typing moves the text under the popover.
        setTarget(null);
      }
    }

    dom.addEventListener("mouseover", onMouseOver);
    dom.addEventListener("mouseout", onMouseOut);
    dom.addEventListener("keydown", onKeyDown);
    return () => {
      dom.removeEventListener("mouseover", onMouseOver);
      dom.removeEventListener("mouseout", onMouseOut);
      dom.removeEventListener("keydown", onKeyDown);
      cancelOpen();
      clearTimeout(closeTimer.current);
    };
  }, [editor]);

  // Close on a click elsewhere or on scroll; move focus in when opened from the keyboard.
  useEffect(() => {
    if (!target) return;
    if (target.focus) ref.current?.querySelector<HTMLElement>("button")?.focus();
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setTarget(null);
    }
    function close() {
      setTarget(null);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", close, true);
    };
  }, [target]);

  if (!target) return null;
  const current = target;

  function dismiss(refocus: boolean) {
    setTarget(null);
    pointerInside.current = false;
    if (refocus) editor.commands.focus();
  }

  function replaceWith(suggestion: string) {
    editor
      .chain()
      .focus()
      .command(({ tr }) => {
        tr.insertText(matchCase(current.word, suggestion), current.from, current.to);
        return true;
      })
      .run();
    dismiss(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      dismiss(true);
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button") ?? []);
      const i = items.indexOf(document.activeElement as HTMLElement);
      items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      e.preventDefault();
    }
  }

  const itemClass = "w-full rounded-md px-2 py-1 text-left outline-none hover:bg-accent focus-visible:bg-accent";

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={`Spelling options for ${current.word}`}
      onKeyDown={onKeyDown}
      onMouseEnter={() => {
        pointerInside.current = true;
        clearTimeout(closeTimer.current);
      }}
      onMouseLeave={() => {
        pointerInside.current = false;
        closeTimer.current = setTimeout(() => setTarget(null), CLOSE_DELAY_MS);
      }}
      style={{ top: current.top, left: current.left }}
      className="fixed z-50 max-h-72 w-52 overflow-y-auto rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10"
    >
      {current.suggestions.length === 0 ? (
        <p className="px-2 py-1.5 text-muted-foreground">No suggestions</p>
      ) : (
        <ul>
          {current.suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button type="button" onClick={() => replaceWith(suggestion)} className={`${itemClass} font-medium`}>
                {matchCase(current.word, suggestion)}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-1 border-t border-foreground/10 pt-1">
        <button
          type="button"
          className={itemClass}
          onClick={() => {
            addToDictionary(current.word);
            dismiss(true);
          }}
        >
          Add to dictionary
        </button>
        <button
          type="button"
          className={itemClass}
          onClick={() => {
            ignoreWord(current.word);
            dismiss(true);
          }}
        >
          Ignore
        </button>
      </div>
    </div>
  );
}
