"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { saveScene } from "@/actions/manuscript";
import { AUTOSAVE_IDLE_MS, AUTOSAVE_MAX_WAIT_MS } from "@/lib/manuscript-config";
import type { LocalCopy } from "@/lib/manuscript-sync";
import type { DocNode } from "@/lib/manuscript-text";
import { useEditorStore } from "@/lib/stores/editor-store";

const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 30000];

export function localCopyKey(nodeId: string) {
  return `prosestack:scene:${nodeId}`;
}

export function readLocalCopy(nodeId: string): LocalCopy | null {
  try {
    const raw = window.localStorage.getItem(localCopyKey(nodeId));
    return raw ? (JSON.parse(raw) as LocalCopy) : null;
  } catch {
    return null;
  }
}

function writeLocalCopy(nodeId: string, copy: LocalCopy) {
  try {
    window.localStorage.setItem(localCopyKey(nodeId), JSON.stringify(copy));
  } catch {
    // Storage can be full or blocked; the server save is still the source of truth.
  }
}

interface UseSceneAutosaveOptions {
  editor: Editor | null;
  projectId: string;
  nodeId: string;
  /** The server's `updatedAt` (ms) for the content the editor opened with. */
  baseUpdatedAt: number;
  /** True when the editor opened with a local copy the server has not seen yet. */
  startDirty: boolean;
}

/**
 * Saves the open scene: after 1.5 s idle, at least every 10 s while typing, and when the editor loses focus, the tab
 * is hidden or the scene closes. Only the open scene is saved. A copy lives in localStorage until the server confirms,
 * and failed saves retry with backoff.
 */
export function useSceneAutosave({ editor, projectId, nodeId, baseUpdatedAt, startDirty }: UseSceneAutosaveOptions) {
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);
  const state = useRef({ dirty: startDirty, saving: false, base: baseUpdatedAt, failures: 0 });
  const timers = useRef<{ idle?: ReturnType<typeof setTimeout>; max?: ReturnType<typeof setTimeout>; retry?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    if (!editor) return;
    const s = state.current;
    const t = timers.current;

    function clearTimers() {
      clearTimeout(t.idle);
      clearTimeout(t.max);
      clearTimeout(t.retry);
      t.idle = t.max = t.retry = undefined;
    }

    async function flush() {
      if (!editor || editor.isDestroyed) return;
      clearTimers();
      if (!s.dirty || s.saving) return;

      const content = editor.getJSON() as DocNode;
      s.dirty = false;
      s.saving = true;
      setSaveStatus("saving");

      let result: Awaited<ReturnType<typeof saveScene>>;
      try {
        result = await saveScene({ projectId, nodeId, content });
      } catch {
        result = { success: false, error: "Network error" };
      }
      s.saving = false;

      if (result.success) {
        s.base = result.data.updatedAt;
        s.failures = 0;
        writeLocalCopy(nodeId, { content, baseUpdatedAt: s.base, dirty: s.dirty });
        setSaveStatus(s.dirty ? "saving" : "saved");
        if (s.dirty) void flush();
        return;
      }

      s.dirty = true;
      setSaveStatus("error");
      const delay = RETRY_DELAYS_MS[Math.min(s.failures, RETRY_DELAYS_MS.length - 1)];
      s.failures += 1;
      t.retry = setTimeout(() => void flush(), delay);
    }

    function onUpdate() {
      if (!editor) return;
      s.dirty = true;
      writeLocalCopy(nodeId, { content: editor.getJSON() as DocNode, baseUpdatedAt: s.base, dirty: true });
      clearTimeout(t.idle);
      t.idle = setTimeout(() => void flush(), AUTOSAVE_IDLE_MS);
      t.max ??= setTimeout(() => void flush(), AUTOSAVE_MAX_WAIT_MS);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") void flush();
    }

    editor.on("update", onUpdate);
    editor.on("blur", flush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    if (s.dirty) void flush();

    return () => {
      editor.off("update", onUpdate);
      editor.off("blur", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      // Leaving the scene: send whatever is pending. The request outlives this component.
      if (s.dirty && !s.saving && !editor.isDestroyed) {
        const content = editor.getJSON() as DocNode;
        s.dirty = false;
        void saveScene({ projectId, nodeId, content }).then((result) => {
          if (result.success) writeLocalCopy(nodeId, { content, baseUpdatedAt: result.data.updatedAt, dirty: false });
        });
      }
      clearTimers();
      setSaveStatus("idle");
    };
  }, [editor, projectId, nodeId, setSaveStatus]);
}
