"use client";

import { DetailTabs } from "@/components/layout/DetailTabs";
import { RightPanel } from "@/components/layout/RightPanel";
import { NotesTab } from "@/components/manuscript/NotesTab";
import { SummaryTab } from "@/components/manuscript/SummaryTab";
import { PlotsTab } from "@/components/plot/PlotsTab";
import type { SceneNoteItem } from "@/types/manuscript";
import type { LabelWithUsage } from "@/types/labels";
import type { PlotData, PlotScene } from "@/types/plot";

interface SceneDetailsPanelProps {
  projectId: string;
  sceneId: string;
  notes: SceneNoteItem[];
  summary: string;
  plot: PlotData;
  /** Every scene in manuscript order, for the plot point dialog. */
  scenes: PlotScene[];
  labels: LabelWithUsage[];
}

/** The right sidebar for the open scene: a Notes tab (the same list as characters and places), a Plots tab and a Summary tab. Remounted per scene. */
export function SceneDetailsPanel({ projectId, sceneId, notes, summary, plot, scenes, labels }: SceneDetailsPanelProps) {
  return (
    <RightPanel title="Scene details" hideTitle>
      <DetailTabs
        label="Scene details"
        notes={<NotesTab projectId={projectId} sceneId={sceneId} notes={notes} />}
        plots={<PlotsTab projectId={projectId} sceneId={sceneId} plot={plot} scenes={scenes} labels={labels} />}
        summary={<SummaryTab projectId={projectId} nodeId={sceneId} initialSummary={summary} />}
      />
    </RightPanel>
  );
}
