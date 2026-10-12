export type TrashKind = "node" | "character" | "place" | "characterNote" | "placeNote" | "sceneNote" | "plotPoint" | "plotLine" | "projectNote";
export type ArchiveKind = "character" | "place";

/** One row of the Trash page. */
export interface TrashItem {
  kind: TrashKind;
  id: string;
  /** The name shown: a title, a character's name, or the start of a note. */
  title: string;
  /** What it is, and for a note whose it is: "Scene", "Character", "Note on Mara Quill". */
  detail: string;
  trashedAt: number;
}

/** One row of the Archive page. */
export interface ArchiveItem {
  kind: ArchiveKind;
  id: string;
  title: string;
  detail: string;
  archivedAt: number;
}

/** One block of a read-only view of a trashed or archived item: an optional heading, then plain text or a manuscript document. */
export interface ViewSection {
  heading?: string;
  text?: string;
  doc?: import("@/lib/manuscript-text").DocNode;
}

/** What the page shows when a trashed or archived item is opened: the item itself, read-only. */
export interface HiddenView {
  kind: TrashKind;
  id: string;
  title: string;
  /** What it is, as in the lists: "Scene", "Character · Main", "Note on Mara Quill". */
  subtitle: string;
  sections: ViewSection[];
}
