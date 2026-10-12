"use client";

import { useState } from "react";
import Link from "next/link";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import type { PlotLineItem, PlotPointItem, PlotScene } from "@/types/plot";

interface PlotLineViewProps {
  projectId: string;
  line: PlotLineItem;
  points: PlotPointItem[];
  /** Every scene in manuscript order: a line's points are shown in this order. */
  scenes: PlotScene[];
  onOpen: (pointId: string) => void;
  onTrash: (pointId: string) => void;
}

/** One plot line on its own: its points as cards in story order, joined by a connector, each with the scene it belongs to. */
export function PlotLineView({ projectId, line, points, scenes, onOpen, onTrash }: PlotLineViewProps) {
  const [confirming, setConfirming] = useState<PlotPointItem | null>(null);
  const items = scenes.flatMap((scene) => {
    const point = points.find((p) => p.plotLineId === line.id && p.sceneId === scene.id);
    return point ? [{ point, scene }] : [];
  });

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-stretch p-4">
      <h1 className="mb-4 truncate text-lg font-semibold">{line.name}</h1>
      {items.length === 0 && <p className="text-sm text-muted-foreground">No plot points on this line yet. Add them in the plot grid.</p>}
      <ol className="flex flex-col items-stretch">
        {items.map(({ point, scene }, index) => (
          <li key={point.id} className="flex flex-col items-stretch">
            {index > 0 && <div className="mx-auto h-6 w-6 bg-muted" aria-hidden />}
            <div className="group/item relative rounded-lg border bg-card text-sm shadow-xs">
              <button
                type="button"
                onClick={() => onOpen(point.id)}
                className="flex w-full flex-col rounded-t-lg pr-8 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {point.title && <span className="border-b px-4 py-3 font-semibold wrap-break-word">{point.title}</span>}
                <span className="min-h-16 px-4 py-3 wrap-break-word whitespace-pre-wrap text-foreground/80">{point.text}</span>
              </button>
              <div className="flex items-center justify-between gap-2 px-4 pb-3">
                <Link
                  href={`/projects/${projectId}/manuscript?scene=${scene.id}`}
                  className="truncate rounded text-xs text-muted-foreground outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {scene.title}
                </Link>
              </div>
              <RowMenu label={`${point.title || "Plot point"} options`} className="top-2 translate-y-0">
                <TrashItem onClick={() => setConfirming(point)} />
              </RowMenu>
            </div>
          </li>
        ))}
      </ol>
      <ConfirmTrashDialog
        target={confirming && { kind: "plot point", name: confirming.title || confirming.text.slice(0, 40) }}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) onTrash(confirming.id);
          setConfirming(null);
        }}
      />
    </div>
  );
}
