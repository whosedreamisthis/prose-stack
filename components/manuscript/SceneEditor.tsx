"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useSceneAutosave } from "@/hooks/useSceneAutosave";
import { consumeEditorFocusRequest } from "@/lib/editor-focus";
import { readLocalCopy } from "@/lib/local-copy";
import { chooseInitialContent } from "@/lib/manuscript-sync";
import { countDocWords, type DocNode } from "@/lib/manuscript-text";
import { useEditorStore } from "@/lib/stores/editor-store";

interface SceneEditorProps {
  projectId: string;
  scene: { id: string; title: string; content: DocNode; updatedAt: number };
}

// Prose only: paragraphs, bold, italic and undo history.
const extensions = [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    listKeymap: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: false,
  }),
];

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
export function SceneEditor({ projectId, scene }: SceneEditorProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [initial] = useState(() => openScene(scene));
  const fontSize = useEditorStore((s) => s.fontSize);
  const spellcheck = useEditorStore((s) => s.spellcheck);
  const setEditor = useEditorStore((s) => s.setEditor);
  const setLiveWords = useEditorStore((s) => s.setLiveWords);

  const editor = useEditor({
    extensions,
    content: initial.content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": `Scene text, ${scene.title}`,
      },
    },
    onCreate: ({ editor }) => setLiveWords(countDocWords(editor.getJSON() as DocNode)),
    onUpdate: ({ editor }) => setLiveWords(countDocWords(editor.getJSON() as DocNode)),
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

  useEffect(() => {
    if (!editor) return;
    setEditor(editor);
    if (consumeEditorFocusRequest()) editor.commands.focus(editor.isEmpty ? "start" : "end");
    return () => {
      setEditor(null);
      setLiveWords(null);
    };
  }, [editor, setEditor, setLiveWords]);

  return (
    <div
      // Spell check is inherited by the editable area below.
      spellCheck={spellcheck}
      style={{ fontSize: `${fontSize}pt` }}
      className="mx-auto w-full max-w-2xl rounded-md border border-foreground/25 bg-card/30 px-3 font-serif leading-relaxed focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50 [&_.ProseMirror]:min-h-[60vh] [&_.ProseMirror]:px-1 [&_.ProseMirror]:py-2 [&_.ProseMirror]:outline-none [&_.ProseMirror_p]:mb-[0.9em]"
    >
      <EditorContent editor={editor} />
    </div>
  );
}
