"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { Editor } from "@tiptap/react";
import { chunkText } from "@/lib/read-aloud";
import { useEditorStore } from "@/lib/stores/editor-store";

const subscribe = () => () => {};
const isSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/** The text to speak: the selection if there is one, otherwise the whole scene, with paragraphs on separate lines. */
function textToRead(editor: Editor): string {
  const { from, to, empty } = editor.state.selection;
  return empty ? editor.state.doc.textBetween(0, editor.state.doc.content.size, "\n", " ") : editor.state.doc.textBetween(from, to, "\n", " ");
}

/**
 * Read aloud for the open scene, through the browser's speech synthesis. The state (idle, speaking, paused) lives in the
 * editor store so the toolbar stays in step. Speech stops when the scene changes or closes, when the writer types, and
 * when the page is left.
 */
export function useReadAloud() {
  const editor = useEditorStore((s) => s.editor);
  const state = useEditorStore((s) => s.speech);
  const setSpeech = useEditorStore((s) => s.setSpeech);
  // False on the server and the first client paint, so the button never mismatches the markup.
  const supported = useSyncExternalStore(subscribe, isSupported, () => false);

  const stop = useCallback(() => {
    if (isSupported()) window.speechSynthesis.cancel();
    useEditorStore.getState().setSpeech("idle");
  }, []);

  const start = useCallback(() => {
    if (!editor || !isSupported()) return;
    const chunks = chunkText(textToRead(editor));
    window.speechSynthesis.cancel();
    if (chunks.length === 0) {
      setSpeech("idle");
      return;
    }
    // A cancelled run fires its own end and error events late; only the run that is current may change the state.
    const run = Symbol();
    currentRun = run;
    chunks.forEach((chunk, i) => {
      const utterance = new SpeechSynthesisUtterance(chunk);
      const finish = () => {
        if (currentRun === run && i === chunks.length - 1) useEditorStore.getState().setSpeech("idle");
      };
      utterance.onend = finish;
      utterance.onerror = (e) => {
        if (currentRun !== run) return;
        if (e.error === "canceled" || e.error === "interrupted") return;
        window.speechSynthesis.cancel();
        useEditorStore.getState().setSpeech("idle");
      };
      window.speechSynthesis.speak(utterance);
    });
    setSpeech("speaking");
  }, [editor, setSpeech]);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setSpeech("paused");
  }, [setSpeech]);

  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setSpeech("speaking");
  }, [setSpeech]);

  // Another scene (or none) means the speech no longer matches the page.
  useEffect(() => stop, [editor, stop]);

  // Typing ends it.
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      if (useEditorStore.getState().speech !== "idle") stop();
    };
    // Selecting text resets playback, so the next Read aloud reads just the selection. A plain click (an empty selection) does not.
    const onSelect = () => {
      if (useEditorStore.getState().speech !== "idle" && !editor.state.selection.empty) stop();
    };
    editor.on("update", onUpdate);
    editor.on("selectionUpdate", onSelect);
    return () => {
      editor.off("update", onUpdate);
      editor.off("selectionUpdate", onSelect);
    };
  }, [editor, stop]);

  // Leaving the page (a reload or closing the tab keeps the browser's queue otherwise).
  useEffect(() => {
    window.addEventListener("pagehide", stop);
    return () => window.removeEventListener("pagehide", stop);
  }, [stop]);

  return { supported, state, start, pause, resume, stop };
}

let currentRun: symbol | null = null;
