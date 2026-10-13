"use client";

import type { ReactNode } from "react";
import { DetailTabs } from "@/components/layout/DetailTabs";
import { RightPanel } from "@/components/layout/RightPanel";
import { SummaryTab } from "@/components/manuscript/SummaryTab";
import { NotesTab } from "@/components/manuscript/NotesTab";
import { PlotGridLink, PlotsTab } from "@/components/plot/PlotsTab";
import type { SceneNoteItem } from "@/types/manuscript";
import type { LabelWithUsage } from "@/types/labels";
import type { PlotData, PlotScene } from "@/types/plot";

interface NodeDetailsPanelProps {
  projectId: string;
  /** "Chapter details", "Part details" or "Manuscript details". */
  title: string;
  /** The chapter, part or book itself, with its own notes (a note list element, since a book keeps its notes differently). */
  ownTitle: string;
  ownNotes: ReactNode;
  /** The chapter or part's own id and summary; the whole book has neither, so it gets no Summary tab. */
  nodeId?: string;
  summary?: string;
  /** What is inside, in reading order, each with its notes (the Plots tab shows the plot points of the scenes). */
  items: { id: string; title: string; type: "PART" | "CHAPTER" | "SCENE"; notes: SceneNoteItem[] }[];
  plot: PlotData;
  /** Every scene in the manuscript, for the plot point dialog. */
  scenes: PlotScene[];
  labels: LabelWithUsage[];
}

const heading = (text: string) => <h3 className="truncate pt-3 text-sm font-medium text-primary">{text}</h3>;

/** The right sidebar for an open chapter or part: its own notes then each scene's, and the plot points of each scene. */
export function NodeDetailsPanel({ projectId, title, ownTitle, ownNotes, nodeId, summary, items, plot, scenes, labels }: NodeDetailsPanelProps) {
  const groups = items.filter((i) => i.type === "SCENE").map(({ id, title }) => ({ scene: { id, title } }));
  const empty = <p className="pt-3 text-sm text-muted-foreground">No scenes yet.</p>;

  return (
    <RightPanel title={title} hideTitle>
      <DetailTabs
        label={title}
        notes={
          <div className="flex flex-col">
            <section aria-label={ownTitle}>
              {heading(ownTitle)}
              {ownNotes}
            </section>
            {items.map((item) => (
              <section key={item.id} aria-label={item.title}>
                {heading(item.title)}
                <NotesTab projectId={projectId} sceneId={item.id} notes={item.notes} />
              </section>
            ))}
          </div>
        }
        summary={nodeId ? <SummaryTab projectId={projectId} nodeId={nodeId} initialSummary={summary ?? ""} /> : undefined}
        plots={
          groups.length === 0 ? (
            empty
          ) : (
            <div className="flex flex-col">
              {/* Once, above the first scene's name. */}
              <div className="-mt-2">
                <PlotGridLink projectId={projectId} />
              </div>
              {groups.map(({ scene }) => (
                <section key={scene.id} aria-label={scene.title}>
                  {heading(scene.title)}
                  <PlotsTab projectId={projectId} sceneId={scene.id} plot={plot} scenes={scenes} labels={labels} showGridLink={false} />
                </section>
              ))}
            </div>
          )
        }
      />
    </RightPanel>
  );
}
