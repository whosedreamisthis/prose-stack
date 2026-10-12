"use client";

import { useId, useState } from "react";
import { createSceneNote, trashSceneNote, updateSceneNote } from "@/actions/scene-notes";
import { NotesList } from "@/components/layout/NotesList";
import { RightPanel } from "@/components/layout/RightPanel";
import { MAX_NOTES_PER_SCENE, MAX_NOTE_LENGTH } from "@/lib/scene-note-config";
import { cn } from "@/lib/utils";
import type { SceneNoteItem } from "@/types/manuscript";

type Tab = "notes" | "plots";
const TABS: { id: Tab; label: string }[] = [
  { id: "notes", label: "Notes" },
  { id: "plots", label: "Plots" },
];

interface SceneNotesPanelProps {
  projectId: string;
  sceneId: string;
  notes: SceneNoteItem[];
}

/** The right sidebar for the open scene: a Notes tab (the same list as characters and places) and a Plots tab. Remounted per scene. */
export function SceneNotesPanel({ projectId, sceneId, notes }: SceneNotesPanelProps) {
  const baseId = useId();
  const [tab, setTab] = useState<Tab>("notes");

  return (
    <RightPanel title="Scene details" hideTitle>
      <div role="tablist" aria-label="Scene details" className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-1.5 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === t.id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${baseId}-panel-${tab}`} aria-labelledby={`${baseId}-tab-${tab}`}>
        {tab === "notes" ? (
          <NotesList
            initialNotes={notes}
            maxNotes={MAX_NOTES_PER_SCENE}
            maxLength={MAX_NOTE_LENGTH}
            onCreate={({ id, title, content }) => createSceneNote({ projectId, sceneId, title, content, id })}
            onUpdate={({ noteId, title, content }) => updateSceneNote({ projectId, sceneId, noteId, title, content })}
            onTrash={({ noteId }) => trashSceneNote({ projectId, sceneId, noteId })}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Plot points linked to this scene will appear here.</p>
        )}
      </div>
    </RightPanel>
  );
}
