import type { CharacterRoleKey, SketchField } from "@/lib/character-config";

/** What the left sidebar list needs. */
export interface CharacterSummary {
  id: string;
  name: string;
  role: CharacterRoleKey;
}

export type CharacterDetail = CharacterSummary & Record<SketchField, string>;

export interface CharacterNoteItem {
  id: string;
  content: string;
}
