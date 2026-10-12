"use client";

import { useEffect, useRef, useState } from "react";
import { AUTOSAVE_IDLE_MS } from "@/lib/manuscript-config";

/** The same pause as the scene editor: a save waits until the writer has stopped typing for this long. */
export const DIALOG_AUTOSAVE_MS = AUTOSAVE_IDLE_MS;

/**
 * Saves a dialog's values a moment after the writer stops typing, so closing it only closes. `save` runs with the latest
 * values (and is never called for values already saved). Returns whether there is a change not yet saved.
 */
export function useDialogAutosave<T>(values: T, save: (values: T) => void, delayMs = DIALOG_AUTOSAVE_MS): { dirty: boolean } {
  const key = JSON.stringify(values);
  const [savedKey, setSavedKey] = useState(key);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  useEffect(() => {
    if (key === savedKey) return;
    const timer = setTimeout(() => {
      saveRef.current(values);
      setSavedKey(key);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [key, savedKey, values, delayMs]);

  return { dirty: key !== savedKey };
}
