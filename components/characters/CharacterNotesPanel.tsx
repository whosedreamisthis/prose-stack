"use client";

import { useId, useState } from "react";
import { createCharacterNote, trashCharacterNote, updateCharacterNote } from "@/actions/characters";
import { NotesList } from "@/components/layout/NotesList";
import { RightPanel } from "@/components/layout/RightPanel";
import { MAX_NOTES_PER_CHARACTER, MAX_NOTE_LENGTH } from "@/lib/character-config";
import { cn } from "@/lib/utils";
import type { CharacterNoteItem } from "@/types/characters";

// More tabs (e.g. links to scenes) can be added here later; each one renders its own panel.
const TABS = [{ id: "notes", label: "Notes" }] as const;

interface NotesPanelProps {
  projectId: string;
  characterId: string;
  notes: CharacterNoteItem[];
}

/** The right sidebar for the open character. Remounted per character, so the notes state always belongs to one character. */
export function CharacterNotesPanel({ projectId, characterId, notes }: NotesPanelProps) {
  const baseId = useId();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("notes");

  return (
    <RightPanel title="Character details" hideTitle>
      <div role="tablist" aria-label="Character details" className="flex gap-1 border-b">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`${baseId}-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`${baseId}-panel-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === id ? "border-primary font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "notes" && (
        <div role="tabpanel" id={`${baseId}-panel-notes`} aria-labelledby={`${baseId}-tab-notes`}>
          <NotesList
            initialNotes={notes}
            maxNotes={MAX_NOTES_PER_CHARACTER}
            maxLength={MAX_NOTE_LENGTH}
            onCreate={({ id, title, content }) => createCharacterNote({ projectId, characterId, title, content, id })}
            onUpdate={({ noteId, title, content }) => updateCharacterNote({ projectId, characterId, noteId, title, content })}
            onTrash={({ noteId }) => trashCharacterNote({ projectId, characterId, noteId })}
          />
        </div>
      )}
    </RightPanel>
  );
}
