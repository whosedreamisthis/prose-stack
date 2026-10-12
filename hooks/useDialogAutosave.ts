"use client";

import { useEffect, useRef, useState } from "react";

/** A save waits until the writer has stopped typing for this long. */
export const DIALOG_AUTOSAVE_MS = 400;

/**
 * Saves a dialog's values a moment after the writer stops typing, so closing it only closes. `save` runs with the latest
 * values (and is never called for values already saved). `save` may return a promise, which keeps the status at "saving" until it
 * settles. The status is "idle" before the first save and while a change waits for the pause in typing.
 */
export type AutosaveStatus = "idle" | "saving" | "saved";

export function useDialogAutosave<T>(
  values: T,
  save: (values: T) => Promise<void> | void,
  delayMs = DIALOG_AUTOSAVE_MS,
): { status: AutosaveStatus } {
  const key = JSON.stringify(values);
  const [savedKey, setSavedKey] = useState(key);
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (key === savedKey) return;
    const timer = setTimeout(() => {
      setSavedKey(key);
      setStatus("saving");
      void Promise.resolve(saveRef.current(values)).finally(() => setStatus("saved"));
    }, delayMs);
    return () => clearTimeout(timer);
  }, [key, savedKey, values, delayMs]);

  // A change made after a save is waiting for the pause again, so nothing is shown for it.
  return { status: key === savedKey ? status : "idle" };
}
