"use client";

import { useEffect, useRef, useState } from "react";

interface TitleEditorProps {
  initial: string;
  label: string;
  /** Called once. `value` is null when cancelled; `refocus` is true for Enter and Escape, false for a blur. */
  onDone: (value: string | null, refocus: boolean) => void;
}

/** In-place title input: Enter or blur saves, Escape cancels. */
export function TitleEditor({ initial, label, onDone }: TitleEditorProps) {
  const [value, setValue] = useState(initial);
  const finished = useRef(false);
  const input = useRef<HTMLInputElement>(null);

  // Focus again on the next frame: a menu or button that just closed can hand focus back to itself after mount.
  useEffect(() => {
    const focus = () => {
      input.current?.focus();
      input.current?.select();
    };
    focus();
    const frame = requestAnimationFrame(focus);
    return () => cancelAnimationFrame(frame);
  }, []);

  function finish(commit: boolean, refocus: boolean) {
    if (finished.current) return;
    finished.current = true;
    onDone(commit ? value : null, refocus);
  }

  return (
    <input
      ref={input}
      value={value}
      aria-label={label}
      onChange={(e) => setValue(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onBlur={() => finish(true, false)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(true, true);
        else if (e.key === "Escape") finish(false, true);
        else return;
        e.preventDefault();
      }}
      className="min-w-0 flex-1 rounded border border-ring bg-background px-1 py-0 text-sm font-normal text-foreground outline-none"
    />
  );
}
