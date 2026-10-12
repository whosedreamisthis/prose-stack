"use client";

import { createSceneNote, trashSceneNote, updateSceneNote } from "@/actions/scene-notes";
import { DetailTabs } from "@/components/layout/DetailTabs";
import { NotesList } from "@/components/layout/NotesList";
import { RightPanel } from "@/components/layout/RightPanel";
import { ScenePlotsPanel } from "@/components/plot/ScenePlotsPanel";
import { MAX_NOTES_PER_SCENE, MAX_NOTE_LENGTH } from "@/lib/scene-note-config";
import type { SceneNoteItem } from "@/types/manuscript";
import type { PlotData, PlotScene } from "@/types/plot";

interface SceneNotesPanelProps {
  projectId: string;
  sceneId: string;
  notes: SceneNoteItem[];
  plot: PlotData;
  /** Every scene in manuscript order, for the plot point dialog. */
  scenes: PlotScene[];
}

/** The notes of one scene, as the list every owner of notes uses. Remount it per scene. */
export function SceneNotes({ projectId, sceneId, notes }: { projectId: string; sceneId: string; notes: SceneNoteItem[] }) {
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

/** The right sidebar for the open scene: a Notes tab (the same list as characters and places) and a Plots tab. Remounted per scene. */
export function SceneNotesPanel({ projectId, sceneId, notes, plot, scenes }: SceneNotesPanelProps) {
  return (
    <RightPanel title="Scene details" hideTitle>
      <DetailTabs
        label="Scene details"
        notes={<SceneNotes projectId={projectId} sceneId={sceneId} notes={notes} />}
        plots={<ScenePlotsPanel projectId={projectId} sceneId={sceneId} plot={plot} scenes={scenes} />}
      />
    </RightPanel>
  );
}
