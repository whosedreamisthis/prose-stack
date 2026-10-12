"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArchiveIcon, MapPinIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { archivePlace, trashPlace } from "@/actions/places";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { ExportItem, RowMenu } from "@/components/manuscript/RowMenu";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { resolveActivePlace } from "@/lib/place-selection";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useOptimisticActive, usePendingNavStore } from "@/lib/stores/pending-nav-store";
import { cn } from "@/lib/utils";
import type { PlaceSummary } from "@/types/places";
import { SELECTED_ROW } from "@/components/layout/sidebar-styles";

interface PlaceListProps {
  projectId: string;
  places: PlaceSummary[];
}

/** The left sidebar: the project's places, with a menu per row. Adding one is the + in the section header (AddPlaceButton). */
export function PlaceList({ projectId, places }: PlaceListProps) {
  const router = useRouter();
  // The sidebar shows on every page, so a place is only "open" while the places page is.
  const onPlacesPage = usePathname().startsWith(`/projects/${projectId}/places`);
  // Read from the URL here, not on the server, so the sidebar can live in the layout and stay mounted between pages.
  const activeId = resolveActivePlace(places, useSearchParams().get("place"))?.id ?? null;
  // The row just clicked is highlighted at once, not when the page has arrived.
  const selectedId = useOptimisticActive(["place"], onPlacesPage ? activeId : null);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const setPending = usePendingNavStore((s) => s.setPending);
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<PlaceSummary | null>(null);

  const hide = (place: PlaceSummary, action: typeof trashPlace, done: string) => {
    startTransition(async () => {
      const result = await action({ projectId, placeId: place.id });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(done);
      // The open place is gone, so drop it from the URL and let the page fall back to another one.
      if (onPlacesPage && place.id === activeId) router.replace(`/projects/${projectId}/places`);
    });
  };

  return (
    <nav aria-label="Places" className="flex flex-col gap-1">
      {places.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">None yet. Use the + above to add one.</p>
      ) : (
        <ul className="ml-3 flex flex-col border-l pl-1">
          {places.map((p) => (
            <li key={p.id} className="group/item relative">
              <Link
                href={`/projects/${projectId}/places?place=${p.id}`}
                aria-current={p.id === selectedId ? "true" : undefined}
                // Fetch the place as the pointer arrives, so the click is usually served from the browser.
                onPointerEnter={() => router.prefetch(`/projects/${projectId}/places?place=${p.id}`)}
                onFocus={() => router.prefetch(`/projects/${projectId}/places?place=${p.id}`)}
                onClick={() => {
                  // Show the card skeleton straight away; only for a place that isn't already open.
                  if (!onPlacesPage) setPending("section", "places");
                  if (!onPlacesPage || p.id !== activeId) setPending("place", p.id);
                  setDrawerOpen(false);
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  p.id === selectedId ? SELECTED_ROW : "text-foreground/80 hover:bg-muted/60",
                )}
              >
                <MapPinIcon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{p.name}</span>
              </Link>
              <RowMenu label={`${p.name} options`}>
                <ExportItem type="place" id={p.id} projectId={projectId} name={p.name} />
                <DropdownMenuItem onClick={() => hide(p, archivePlace, "Place archived.")}>
                  <ArchiveIcon /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirming(p)}>
                  <Trash2Icon /> Move to trash
                </DropdownMenuItem>
              </RowMenu>
            </li>
          ))}
        </ul>
      )}
      <ConfirmTrashDialog
        target={confirming && { kind: "place", name: confirming.name }}
        onCancel={() => setConfirming(null)}
        onConfirm={() => {
          if (confirming) hide(confirming, trashPlace, "Moved to the trash.");
          setConfirming(null);
        }}
      />
    </nav>
  );
}
