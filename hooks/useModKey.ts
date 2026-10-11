"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** The shortcut modifier for this platform: "⌘" on Apple devices, otherwise "Ctrl". "Ctrl" on the server and first paint, so hydration matches. */
export function useModKey() {
  return useSyncExternalStore(
    subscribe,
    () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"),
    () => "Ctrl",
  );
}
