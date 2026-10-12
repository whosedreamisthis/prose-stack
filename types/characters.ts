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
  /** Empty when the note has no title. */
  title: string;
  content: string;
}
