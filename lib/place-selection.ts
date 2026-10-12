import type { PlaceSummary } from "@/types/places";

/** The place a request asks for, else the first in the list. Pure, so client code can use it too. */
export function resolveActivePlace(places: PlaceSummary[], requestedId: string | undefined | null) {
  return places.find((p) => p.id === requestedId) ?? places[0] ?? null;
}
