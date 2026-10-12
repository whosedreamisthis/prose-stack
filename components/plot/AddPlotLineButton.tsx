"use client";

import { GitBranchIcon, MoreHorizontalIcon } from "lucide-react";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { usePlotActions } from "@/hooks/usePlotActions";
import { usePlotData } from "@/hooks/usePlotData";
import { MAX_PLOT_LINES } from "@/lib/plot-config";
import { useLayoutStore } from "@/lib/stores/layout-store";
import type { PlotData } from "@/types/plot";

/** The "…" in the Plots section header: adds a plot line, as the grid's "Add plot line" does. */
export function AddPlotLineButton({ projectId, plot }: { projectId: string; plot: PlotData }) {
  const { lines } = usePlotData(plot);
  const actions = usePlotActions(projectId);
  const setSectionOpen = useLayoutStore((s) => s.setSectionOpen);

  const add = () => {
    // The header's menu works while the section is collapsed, so open it to show the new line.
    if (actions.addLine()) setSectionOpen("plot", true);
  };

  return (
    <DropdownMenu>
      <Hint label="Add to plots" side="right">
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Add to plots" />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
      </Hint>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem disabled={lines.length >= MAX_PLOT_LINES} onClick={add}>
          <GitBranchIcon /> Add plot line
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
