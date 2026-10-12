import type { DocNode } from "@/lib/manuscript-text";

export type ResearchItemType = "NOTE" | "LINK" | "IMAGE" | "FILE";

/** An uploaded image's or file's stored details. */
export interface ResearchUpload {
  name: string;
  size: number;
  mimeType: string;
}

/** A folder as the sidebar tree needs it. */
export interface ResearchFolderSummary {
  id: string;
  parentId: string | null;
  name: string;
  position: number;
}

/** An item as the sidebar tree needs it. */
export interface ResearchItemSummary {
  id: string;
  folderId: string | null;
  type: ResearchItemType;
  title: string;
  position: number;
}

/** The project's live research library: every folder and item that is neither trashed nor archived. */
export interface ResearchLibrary {
  folders: ResearchFolderSummary[];
  items: ResearchItemSummary[];
}

/** What an item can link to in the story. */
export type ResearchLinkKind = "character" | "place" | "scene";

export interface ResearchLinkTarget {
  kind: ResearchLinkKind;
  id: string;
  name: string;
}

/** One item opened in the main pane. */
export interface ResearchItemDetail extends ResearchItemSummary {
  content: DocNode | null;
  /** A link's address, or an upload's stored-file address. */
  url: string;
  description: string;
  /** IMAGE and FILE only. */
  upload: ResearchUpload | null;
  /** The live character, place or scene the item links to; null when none, or while that target is trashed or archived. */
  link: ResearchLinkTarget | null;
}

/** The characters, places and scenes an item can be linked to, for the picker. */
export interface ResearchLinkOptions {
  characters: { id: string; name: string }[];
  places: { id: string; name: string }[];
  scenes: { id: string; name: string }[];
}
