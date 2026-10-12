import type { PlaceField } from "@/lib/place-config";

/** What the left sidebar list needs. */
export interface PlaceSummary {
  id: string;
  name: string;
}

export type PlaceDetail = PlaceSummary &
  Record<PlaceField, string> & {
    /** Ids of the place's live (not trashed or archived) related characters. */
    relatedCharacterIds: string[];
  };

export interface PlaceNoteItem {
  id: string;
  content: string;
}
