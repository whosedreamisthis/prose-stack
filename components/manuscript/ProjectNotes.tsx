"use client";

import { createProjectNote, trashProjectNote, updateProjectNote } from "@/actions/project-notes";
import { NotesList } from "@/components/layout/NotesList";
import { MAX_NOTES_PER_PROJECT, MAX_NOTE_LENGTH } from "@/lib/project-note-config";
import type { SceneNoteItem } from "@/types/manuscript";

/** The notes of the whole manuscript, as the list every owner of notes uses. */
export function ProjectNotes({ projectId, notes }: { projectId: string; notes: SceneNoteItem[] }) {
  return (
    <NotesList
      initialNotes={notes}
      maxNotes={MAX_NOTES_PER_PROJECT}
      maxLength={MAX_NOTE_LENGTH}
      onCreate={({ id, title, content }) => createProjectNote({ projectId, title, content, id })}
      onUpdate={({ noteId, title, content }) => updateProjectNote({ projectId, noteId, title, content })}
      onTrash={({ noteId }) => trashProjectNote({ projectId, noteId })}
    />
  );
}
