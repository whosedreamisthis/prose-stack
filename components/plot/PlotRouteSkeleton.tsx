"use client";

import { useSearchParams } from "next/navigation";
import { PlotLineSkeleton } from "@/components/plot/PlotLineSkeleton";
import { PlotSkeleton } from "@/components/plot/PlotSkeleton";

/**
 * The skeleton for the plot route: one plot line's cards when a line is open or has just been clicked (`lineId`), the
 * grid's columns otherwise. Read from the URL when no click is pending, as on a first load.
 */
export function PlotRouteSkeleton({ lineId }: { lineId?: string | null }) {
  const fromUrl = useSearchParams().get("line");
  const line = lineId === undefined ? fromUrl : lineId === "grid" ? null : lineId;
  return line ? <PlotLineSkeleton /> : <PlotSkeleton />;
}
