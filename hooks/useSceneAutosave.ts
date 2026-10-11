"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import { saveScene } from "@/actions/manuscript";
import { createAutosaveScheduler } from "@/lib/autosave-scheduler";
import { writeLocalCopy } from "@/lib/local-copy";
import { AUTOSAVE_IDLE_MS, AUTOSAVE_MAX_WAIT_MS } from "@/lib/manuscript-config";
import type { DocNode } from "@/lib/manuscript-text";
import { useEditorStore } from "@/lib/stores/editor-store";

const RETRY_DELAYS_MS = [2000, 4000, 8000, 15000, 30000];

interface UseSceneAutosaveOptions {
  editor: Editor | null;
  projectId: string;
  nodeId: string;
  /** The server's `updatedAt` (ms) for the content the editor opened with. */
  baseUpdatedAt: number;
  /** True when the editor opened with a local copy the server has not seen yet. */
  startDirty: boolean;
  /** Called after the server confirms a save with nothing newer pending. */
  onSaved?: () => void;
}

/**
 * Saves the open scene: after 1.5 s idle, at least every 10 s while typing, and when the editor loses focus, the tab
 * is hidden or the scene closes. Only the open scene is saved. A copy lives in localStorage until the server confirms,
 * and failed saves retry with backoff.
 */
export function useSceneAutosave({ editor, projectId, nodeId, baseUpdatedAt, startDirty, onSaved }: UseSceneAutosaveOptions) {
  const setSaveStatus = useEditorStore((s) => s.setSaveStatus);

  useEffect(() => {
    if (!editor) return;
    let base = baseUpdatedAt;

    const scheduler = createAutosaveScheduler({
      idleMs: AUTOSAVE_IDLE_MS,
      maxWaitMs: AUTOSAVE_MAX_WAIT_MS,
      retryDelaysMs: RETRY_DELAYS_MS,
      startDirty,
      onStatus: (status) => {
        setSaveStatus(status);
        if (status === "saved") onSaved?.();
      },
      save: async () => {
        const content = editor.getJSON() as DocNode;
        let result: Awaited<ReturnType<typeof saveScene>>;
        try {
          result = await saveScene({ projectId, nodeId, content });
        } catch {
          return false;
        }
        if (!result.success) return false;
        base = result.data.updatedAt;
        // Edits made while the save ran keep the copy dirty; the scheduler saves them next.
        writeLocalCopy(nodeId, { content, baseUpdatedAt: base, dirty: scheduler.dirty });
        return true;
      },
    });

    function onUpdate() {
      writeLocalCopy(nodeId, { content: editor!.getJSON() as DocNode, baseUpdatedAt: base, dirty: true });
      scheduler.markDirty();
    }
    const flush = () => void scheduler.flush();
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }

    editor.on("update", onUpdate);
    editor.on("blur", flush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    if (startDirty) flush();

    return () => {
      editor.off("update", onUpdate);
      editor.off("blur", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      // Leaving the scene: send whatever is pending. The request outlives this component.
      if (scheduler.dirty && !scheduler.saving && !editor.isDestroyed) {
        const content = editor.getJSON() as DocNode;
        void saveScene({ projectId, nodeId, content }).then((result) => {
          if (result.success) writeLocalCopy(nodeId, { content, baseUpdatedAt: result.data.updatedAt, dirty: false });
        });
      }
      scheduler.dispose();
      setSaveStatus("idle");
    };
  }, [editor, projectId, nodeId, baseUpdatedAt, startDirty, onSaved, setSaveStatus]);
}
