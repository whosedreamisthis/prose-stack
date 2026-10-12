"use client";

import { useId } from "react";
import { createPlaceNote, deletePlaceNote, updatePlaceNote } from "@/actions/places";
import { NotesList } from "@/components/layout/NotesList";
import { RightPanel } from "@/components/layout/RightPanel";
import { MAX_NOTES_PER_PLACE, MAX_NOTE_LENGTH } from "@/lib/place-config";
import type { PlaceNoteItem } from "@/types/places";

interface PlaceNotesPanelProps {
  projectId: string;
  placeId: string;
  notes: PlaceNoteItem[];
}

/** The right sidebar for the open place. Remounted per place, so the notes state always belongs to one place. */
export function PlaceNotesPanel({ projectId, placeId, notes }: PlaceNotesPanelProps) {
  const baseId = useId();

  return (
    <RightPanel title="Place details" hideTitle>
      <div role="tablist" aria-label="Place details" className="flex gap-1 border-b">
        <button
          type="button"
          role="tab"
          id={`${baseId}-tab-notes`}
          aria-selected
          aria-controls={`${baseId}-panel-notes`}
          className="-mb-px border-b-2 border-primary px-2.5 py-1.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Notes
        </button>
      </div>
      <div role="tabpanel" id={`${baseId}-panel-notes`} aria-labelledby={`${baseId}-tab-notes`}>
        <NotesList
          initialNotes={notes}
          maxNotes={MAX_NOTES_PER_PLACE}
          maxLength={MAX_NOTE_LENGTH}
          onCreate={({ id, content }) => createPlaceNote({ projectId, placeId, content, id })}
          onUpdate={({ noteId, content }) => updatePlaceNote({ projectId, placeId, noteId, content })}
          onDelete={({ noteId }) => deletePlaceNote({ projectId, placeId, noteId })}
        />
      </div>
    </RightPanel>
  );
}
