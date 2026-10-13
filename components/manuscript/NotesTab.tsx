"use client";

import { createSceneNote, trashSceneNote, updateSceneNote } from "@/actions/scene-notes";
import { NotesList } from "@/components/layout/NotesList";
import { MAX_NOTES_PER_SCENE, MAX_NOTE_LENGTH } from "@/lib/scene-note-config";
import type { SceneNoteItem } from "@/types/manuscript";

/** The notes of one scene, as the list every owner of notes uses. Remount it per scene. */
export function NotesTab({ projectId, sceneId, notes }: { projectId: string; sceneId: string; notes: SceneNoteItem[] }) {
  return (
    <NotesList
      initialNotes={notes}
      maxNotes={MAX_NOTES_PER_SCENE}
      maxLength={MAX_NOTE_LENGTH}
      onCreate={({ id, title, content }) => createSceneNote({ projectId, sceneId, title, content, id })}
      onUpdate={({ noteId, title, content }) => updateSceneNote({ projectId, sceneId, noteId, title, content })}
      onTrash={({ noteId }) => trashSceneNote({ projectId, sceneId, noteId })}
    />
  );
}
