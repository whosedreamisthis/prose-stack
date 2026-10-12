"use client";

import { useEffect, type ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import { SketchSkeleton } from "@/components/characters/SketchSkeleton";
import { EditorSkeleton } from "@/components/manuscript/EditorSkeleton";
import { PlaceSkeleton } from "@/components/places/PlaceSkeleton";
import { PlotRouteSkeleton } from "@/components/plot/PlotRouteSkeleton";
import { ListSkeleton } from "@/components/trash/ListSkeleton";
import { usePendingNavStore } from "@/lib/stores/pending-nav-store";

const SKELETONS: Record<string, ReactNode> = {
  manuscript: <EditorSkeleton />,
  characters: <SketchSkeleton />,
  places: <PlaceSkeleton />,
  trash: <ListSkeleton />,
  archive: <ListSkeleton />,
};

/**
 * The main pane. From the moment another section is clicked until its page has arrived it shows that section's skeleton,
 * so switching sections answers at once instead of leaving the old page up through the server round trip.
 */
export function PendingSection({ children }: { children: ReactNode }) {
  const { projectId } = useParams<{ projectId: string }>();
  const pathname = usePathname();
  const target = usePendingNavStore((s) => s.pending.section);
  const visible = usePendingNavStore((s) => s.visible.section);
  const setPending = usePendingNavStore((s) => s.setPending);
  const pendingPlot = usePendingNavStore((s) => s.pending.plot);
  const arrived = target !== null && pathname.startsWith(`/projects/${projectId}/${target}`);
  const waiting = target !== null && !arrived;

  // Any path change means the navigation finished (or was replaced by another), so the wait is over either way.
  useEffect(() => {
    setPending("section", null);
  }, [pathname, setPending]);

  // The skeleton waits a moment (see SKELETON_DELAY_MS); until then the current page stays, so quick switches don't flash.
  if (waiting && visible && target === "plot") return <PlotRouteSkeleton lineId={pendingPlot} />;
  return waiting && visible && target ? (SKELETONS[target] ?? children) : children;
}
