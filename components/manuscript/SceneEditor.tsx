"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { FindPanel } from "@/components/manuscript/FindPanel";
import { SpellSuggestPopover } from "@/components/manuscript/SpellSuggestPopover";
import { ThesaurusPopover } from "@/components/manuscript/ThesaurusPopover";
import { useSceneAutosave } from "@/hooks/useSceneAutosave";
import { consumeEditorFocusRequest } from "@/lib/editor-focus";
import { FORMATTED_TEXT, formattingStyle } from "@/lib/formatting";
import { readLocalCopy } from "@/lib/local-copy";
import { useSpellStatus } from "@/lib/spell-engine";
import { chooseInitialContent } from "@/lib/manuscript-sync";
import { PROSE_EXTENSIONS } from "@/components/manuscript/prose-extensions";
import { countDocWords, type DocNode } from "@/lib/manuscript-text";
import type { Formatting } from "@/lib/project-config";
import { useEditorStore } from "@/lib/stores/editor-store";
import { applyPreview, useFormattingStore } from "@/lib/stores/formatting-store";

interface SceneEditorProps {
  projectId: string;
  /** The project's saved formatting, from the server. */
  formatting: Formatting;
  scene: { id: string; title: string; content: DocNode; updatedAt: number };
  /** One of several editors on a chapter page: no frame, and the toolbar follows whichever one has focus. */
  embedded?: boolean;
}

/** What the editor opens with. Fixed for the life of the editor: later server refreshes must not swap text mid-typing. */
function openScene(scene: SceneEditorProps["scene"]) {
  const local = typeof window === "undefined" ? null : readLocalCopy(scene.id);
  const content = chooseInitialContent(scene, local);
  const usesLocal = !!local && content === local.content;
  return {
    content,
    baseUpdatedAt: usesLocal ? local.baseUpdatedAt : scene.updatedAt,
    startDirty: usesLocal && local.dirty,
  };
}

/** The Tiptap editor for one scene. Mount it with `key={scene.id}` so each scene gets a fresh editor and autosave. */
export function SceneEditor({ projectId, formatting, scene, embedded = false }: SceneEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [initial] = useState(() => openScene(scene));
  const preview = useFormattingStore((s) => s.preview);
  const setSavedFormatting = useFormattingStore((s) => s.setSaved);
  // The saved formatting from the server, with the settings modal's or the toolbar's pending change on top.
  const shown = applyPreview(formatting, preview);
  const spellcheck = useEditorStore((s) => s.spellcheck);
  const setEditor = useEditorStore((s) => s.setEditor);
  const activeEditor = useEditorStore((s) => s.editor);
  const setLiveWords = useEditorStore((s) => s.setLiveWords);
  const findOpen = useEditorStore((s) => s.findOpen);
  const thesaurusOpen = useEditorStore((s) => s.thesaurusOpen);

  const editor = useEditor({
    extensions: PROSE_EXTENSIONS,
    content: initial.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": `Scene text, ${scene.title}`,
      },
      // Find and the thesaurus have their own panels, and their shortcuts replace the browser's find.
      handleKeyDown: (_view, event) => {
        if (!(event.ctrlKey || event.metaKey) || event.altKey) return false;
        const key = event.key.toLowerCase();
        const { setFindOpen, setThesaurusOpen } = useEditorStore.getState();
        if (key === "f" && !event.shiftKey) setFindOpen(true);
        else if (key === "t" && event.shiftKey) setThesaurusOpen(true);
        else return false;
        event.preventDefault();
        return true;
      },
    },
    // The footer's live count follows a single open scene; on a chapter page it settles to the server totals after each save.
    onCreate: ({ editor }) => !embedded && setLiveWords(countDocWords(editor.getJSON() as DocNode)),
    onUpdate: ({ editor }) => !embedded && setLiveWords(countDocWords(editor.getJSON() as DocNode)),
    onFocus: ({ editor }) => embedded && setEditor(editor),
  });

  useSceneAutosave({
    editor,
    projectId,
    nodeId: scene.id,
    baseUpdatedAt: initial.baseUpdatedAt,
    startDirty: initial.startDirty,
    // Re-render the page so the footer settles to the server totals (and words today starts counting).
    onSaved: useCallback(() => startTransition(() => router.refresh()), [router]),
  });

  // Saved font size and spell check load after mount so the first render matches the server.
  useEffect(() => {
    void useEditorStore.persist.rehydrate();
  }, []);

  // The toolbar is in another route slot, so it reads the saved formatting from the store.
  const { fontFamily, fontSize, lineSpacing } = formatting;
  useEffect(() => {
    setSavedFormatting(projectId, { fontFamily, fontSize, lineSpacing });
    return () => setSavedFormatting(null, null);
  }, [projectId, fontFamily, fontSize, lineSpacing, setSavedFormatting]);

  useEffect(() => {
    if (!editor) return;
    if (!embedded) {
      setEditor(editor);
      if (consumeEditorFocusRequest()) editor.commands.focus(editor.isEmpty ? "start" : "end");
    }
    return () => {
      // An embedded editor only lets go of the toolbar if it still holds it.
      if (embedded && useEditorStore.getState().editor !== editor) return;
      setEditor(null);
      setLiveWords(null);
      useEditorStore.getState().setFindOpen(false);
      useEditorStore.getState().setThesaurusOpen(false);
    };
  }, [editor, embedded, setEditor, setLiveWords]);

  // Our own underlines and suggestions take over once the dictionary is in; until then, or if it fails, the browser's spell check runs.
  const spellStatus = useSpellStatus();
  const ownSpellcheck = spellcheck && spellStatus === "ready";
  useEffect(() => {
    if (!editor) return;
    editor.commands.setSpellcheck(spellcheck);
  }, [editor, spellcheck]);

  const showPanels = !embedded || activeEditor === editor;

  return (
    <>
      {showPanels && findOpen && editor && <FindPanel editor={editor} />}
      {showPanels && thesaurusOpen && editor && <ThesaurusPopover editor={editor} />}
      {ownSpellcheck && editor && <SpellSuggestPopover editor={editor} />}
      <div
        // The browser's spell check is inherited by the editable area below; it steps aside for ours.
        spellCheck={spellcheck && !ownSpellcheck}
        style={formattingStyle(shown)}
        className={`${FORMATTED_TEXT} mx-auto w-full max-w-2xl rounded-md px-3 ${embedded ? "border border-transparent focus-within:border-ring/50 [&_.ProseMirror]:min-h-24" : "border border-foreground/25 bg-card/30 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 [&_.ProseMirror]:min-h-[60vh]"} [&_.ProseMirror]:px-1 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-(--editor-gap)`}
      >
        <EditorContent editor={editor} />
      </div>
    </>
  );
}
