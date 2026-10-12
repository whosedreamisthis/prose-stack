"use client";

import { DetailTabs } from "@/components/layout/DetailTabs";
import { RightPanel } from "@/components/layout/RightPanel";
import { SceneNotes } from "@/components/manuscript/SceneNotesPanel";
import { PlotGridLink, ScenePlotsPanel } from "@/components/plot/ScenePlotsPanel";
import type { SceneNoteItem } from "@/types/manuscript";
import type { PlotData, PlotScene } from "@/types/plot";

interface NodeDetailsPanelProps {
  projectId: string;
  /** "Chapter details" or "Part details". */
  title: string;
  /** The chapter or part itself: its own notes are kept like a scene's. */
  nodeId: string;
  nodeTitle: string;
  notes: SceneNoteItem[];
  /** The scenes inside the chapter or part, in reading order, each with its notes (the Plots tab shows their plot points). */
  groups: { scene: PlotScene; notes: SceneNoteItem[] }[];
  plot: PlotData;
  /** Every scene in the manuscript, for the plot point dialog. */
  scenes: PlotScene[];
}

const heading = (text: string) => <h3 className="truncate pt-3 text-sm font-medium text-primary">{text}</h3>;

/** The right sidebar for an open chapter or part: its own notes then each scene's, and the plot points of each scene. */
export function NodeDetailsPanel({ projectId, title, nodeId, nodeTitle, notes, groups, plot, scenes }: NodeDetailsPanelProps) {
  const empty = <p className="pt-3 text-sm text-muted-foreground">No scenes yet.</p>;

  return (
    <RightPanel title={title} hideTitle>
      <DetailTabs
        label={title}
        notes={
          <div className="flex flex-col">
            <section aria-label={nodeTitle}>
              {heading(nodeTitle)}
              <SceneNotes projectId={projectId} sceneId={nodeId} notes={notes} />
            </section>
            {groups.map(({ scene, notes: sceneNotes }) => (
              <section key={scene.id} aria-label={scene.title}>
                {heading(scene.title)}
                <SceneNotes projectId={projectId} sceneId={scene.id} notes={sceneNotes} />
              </section>
            ))}
          </div>
        }
        plots={
          groups.length === 0 ? (
            empty
          ) : (
            <div className="flex flex-col">
              {/* Once, above the first scene's name. */}
              <div className="pt-3">
                <PlotGridLink projectId={projectId} />
              </div>
              {groups.map(({ scene }) => (
                <section key={scene.id} aria-label={scene.title}>
                  {heading(scene.title)}
                  <ScenePlotsPanel projectId={projectId} sceneId={scene.id} plot={plot} scenes={scenes} showGridLink={false} />
                </section>
              ))}
            </div>
          )
        }
      />
    </RightPanel>
  );
}
