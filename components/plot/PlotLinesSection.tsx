"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, GitBranchIcon, LayoutGridIcon } from "lucide-react";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { SELECTED_ROW } from "@/components/layout/sidebar-styles";
import { RenameItem, RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import { TitleEditor } from "@/components/manuscript/TitleEditor";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { usePlotActions } from "@/hooks/usePlotActions";
import { usePlotData } from "@/hooks/usePlotData";
import { plotLineNameSchema } from "@/lib/plot-config";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useOptimisticActive, usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { cn } from "@/lib/utils";
import type { PlotData, PlotLineItem } from "@/types/plot";

const ROW = "flex items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface PlotLinesSectionProps {
  projectId: string;
  plot: PlotData;
}

/** The body of the Plots section in the left sidebar: the Plot grid row, then one row per plot line, in order. */
export function PlotLinesSection({ projectId, plot }: PlotLinesSectionProps) {
  const router = useRouter();
  const gridPath = `/projects/${projectId}/plot`;
  const onGrid = usePathname() === gridPath;
  // Read from the URL here, not on the server, so the sidebar can live in the layout and stay mounted between pages.
  const activeLineId = useSearchParams().get("line");
  const { lines } = usePlotData(plot);
  const actions = usePlotActions(projectId);
  // The row just clicked is highlighted at once, not when the page has arrived ("grid" is the Plot grid row).
  const selected = useOptimisticActive(["plot"], onGrid ? (activeLineId ?? "grid") : null);
  const search = useSearchParams().toString();
  const pathname = usePathname();
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const setRightDrawerOpen = useLayoutStore((s) => s.setRightDrawerOpen);
  const setHasRightPanel = useLayoutStore((s) => s.setHasRightPanel);
  const setPending = usePendingNavStore((s) => s.setPending);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<PlotLineItem | null>(null);

  /** Ends an inline rename: a changed, valid name is saved; Escape, a blank or an unchanged name just closes the input. */
  const finishRename = (line: PlotLineItem, value: string | null) => {
    setEditingId(null);
    const name = plotLineNameSchema.safeParse(value ?? "");
    if (name.success && name.data !== line.name) actions.renameLine(line.id, name.data);
  };

  // Any URL change means the click has arrived (or was replaced by another), so the wait is over.
  const clearPending = usePendingNavStore((s) => s.setPending);
  useEffect(() => {
    clearPending("plot", null);
  }, [pathname, search, clearPending]);

  const open = (id: string) => {
    setPending("plot", id);
    if (!onGrid) setPending("section", "plot");
    setDrawerOpen(false);
    // The grid has no right panel: close the scene panel now, not when the page arrives.
    setRightDrawerOpen(false);
    setHasRightPanel(false);
  };

  return (
    <nav aria-label="Plots" className="flex flex-col gap-1">
      <ul className="ml-3 flex flex-col border-l pl-1">
        <li>
          <Link
            href={gridPath}
            aria-current={selected === "grid" ? "true" : undefined}
            onPointerEnter={() => router.prefetch(gridPath)}
            onFocus={() => router.prefetch(gridPath)}
            onClick={() => open("grid")}
            className={cn(ROW, "pr-2", selected === "grid" ? SELECTED_ROW : "text-foreground/80 hover:bg-muted/60")}
          >
            <LayoutGridIcon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">Plot grid</span>
          </Link>
        </li>
        {lines.map((line, index) => {
          const isSelected = line.id === selected;
          return (
            <li key={line.id} className="group/item relative">
              {editingId === line.id ? (
                <div className={cn(ROW, "pr-2")}>
                  <GitBranchIcon className="size-4 shrink-0" aria-hidden />
                  <TitleEditor initial={line.name} label="Rename plot line" onDone={(value) => finishRename(line, value)} />
                </div>
              ) : (
                <Link
                  href={`${gridPath}?line=${line.id}`}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => open(line.id)}
                  onDoubleClick={() => setEditingId(line.id)}
                  className={cn(ROW, isSelected ? SELECTED_ROW : "text-foreground/80 hover:bg-muted/60")}
                >
                  <GitBranchIcon className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{line.name}</span>
                </Link>
              )}
              <RowMenu label={`${line.name} options`}>
                <RenameItem onClick={() => setEditingId(line.id)} />
                <DropdownMenuItem disabled={index === 0} onClick={() => actions.moveLine(line.id, -1)}>
                  <ArrowUpIcon /> Move up
                </DropdownMenuItem>
                <DropdownMenuItem disabled={index === lines.length - 1} onClick={() => actions.moveLine(line.id, 1)}>
                  <ArrowDownIcon /> Move down
                </DropdownMenuItem>
                <TrashItem onClick={() => setConfirming(line)} />
              </RowMenu>
            </li>
          );
        })}
      </ul>
      {lines.length === 0 && <p className="px-2 py-1 text-sm text-muted-foreground">No plot lines yet. Add one in the grid.</p>}
      <ConfirmTrashDialog
        target={confirming && { kind: "plot line", name: confirming.name, detail: "Its plot points are hidden with it and return if you restore it." }}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) {
            const wasOpen = onGrid && confirming.id === activeLineId;
            actions.trashLine(confirming.id);
            // The open line is gone, so drop it from the URL.
            if (wasOpen) router.replace(gridPath);
          }
          setConfirming(null);
        }}
      />
    </nav>
  );
}
