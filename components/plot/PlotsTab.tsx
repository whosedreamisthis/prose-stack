"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGridIcon, PlusIcon } from "lucide-react";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { Hint } from "@/components/layout/Hint";
import { RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import { usePlotPointEditor } from "@/components/plot/PlotPointEditor";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { usePlotActions } from "@/hooks/usePlotActions";
import { LabelChip } from "@/components/labels/LabelChip";
import { useLabelData } from "@/hooks/useLabelData";
import { usePlotData } from "@/hooks/usePlotData";
import type { LabelWithUsage } from "@/types/labels";
import type { PlotData, PlotPointItem, PlotScene } from "@/types/plot";

/** The grid icon at the top right of a Plots tab: opens the plot grid. */
export function PlotGridLink({ projectId }: { projectId: string }) {
  const setPending = usePendingNavStore((s) => s.setPending);
  return (
    <div className="flex justify-end">
      <Hint label="Open plot grid" side="left">
        <Link
          href={`/projects/${projectId}/plot`}
          aria-label="Open plot grid"
          // Show the grid skeleton straight away, while the page loads.
          onClick={() => setPending("section", "plot")}
          className="grid size-7 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LayoutGridIcon className="size-4" aria-hidden />
        </Link>
      </Hint>
    </div>
  );
}

interface PlotsTabProps {
  projectId: string;
  sceneId: string;
  plot: PlotData;
  /** Every scene, in manuscript order, for the scene choice in the dialog. */
  scenes: PlotScene[];
  labels: LabelWithUsage[];
  /** Show the grid icon. Off for all but the first of several panels on one sidebar. */
  showGridLink?: boolean;
}

/**
 * The Plots tab of a scene's right sidebar: the scene's plot points (at most one per plot line) as compact cards, built
 * like the notes list. A card, or the dashed add card, opens the plot point dialog.
 */
export function PlotsTab({ projectId, sceneId, plot, scenes, labels: serverLabels, showGridLink = true }: PlotsTabProps) {
  const { lines, points } = usePlotData(plot);
  const labels = useLabelData(serverLabels);
  const actions = usePlotActions(projectId);
  const editor = usePlotPointEditor({ projectId, lines, points, scenes, labels });
  const [confirming, setConfirming] = useState<PlotPointItem | null>(null);

  const lineName = (id: string) => lines.find((l) => l.id === id)?.name ?? "";
  const here = lines.flatMap((line) => points.filter((p) => p.sceneId === sceneId && p.plotLineId === line.id));
  const freeLine = lines.find((line) => !here.some((p) => p.plotLineId === line.id));

  return (
    <div className="-mt-2 flex flex-col gap-2">
      {showGridLink && <PlotGridLink projectId={projectId} />}
      <ul className="flex flex-col gap-2">
        {here.map((point) => (
          <li key={point.id} className="group/item relative">
            <button
              type="button"
              onClick={() => editor.openPoint(point.id)}
              className="flex min-h-16 w-full flex-col gap-1 overflow-hidden rounded-lg border bg-card p-3 pr-9 text-left text-sm outline-none transition-colors hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="truncate text-xs font-medium text-primary">{lineName(point.plotLineId)}</span>
              {point.title && <span className="truncate font-semibold">{point.title}</span>}
              {point.text && <span className="line-clamp-3 wrap-break-word whitespace-pre-wrap text-foreground/80">{point.text}</span>}
              {labels.find((l) => l.id === point.labelId) && (
                <LabelChip label={labels.find((l) => l.id === point.labelId)!} className="mt-auto self-start" />
              )}
            </button>
            <RowMenu label={`${point.title || "Plot point"} options`} className="top-2 translate-y-0">
              <TrashItem onClick={() => setConfirming(point)} />
            </RowMenu>
          </li>
        ))}
        <li>
          {lines.length === 0 ? (
            <Link
              href={`/projects/${projectId}/plot`}
              className="flex w-full items-center justify-center rounded-lg border-2 border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Add a plot line in the grid first
            </Link>
          ) : (
            <button
              type="button"
              disabled={!freeLine}
              onClick={() => freeLine && editor.openNew({ plotLineId: freeLine.id, sceneId })}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border px-3 py-4 text-sm text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            >
              {freeLine ? (
                <>
                  Add a plot point <PlusIcon className="size-4" aria-hidden />
                </>
              ) : (
                "Every plot line has a point here"
              )}
            </button>
          )}
        </li>
      </ul>
      {editor.dialog}
      <ConfirmTrashDialog
        target={confirming && { kind: "plot point", name: confirming.title || confirming.text.slice(0, 40) }}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) actions.trashPoint(confirming.id);
          setConfirming(null);
        }}
      />
    </div>
  );
}
