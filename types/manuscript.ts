import type { NodeType } from "@/lib/manuscript-config";
import type { DocNode } from "@/lib/manuscript-text";

export interface ManuscriptNodeSummary {
  id: string;
  parentId: string | null;
  type: NodeType;
  title: string;
  position: number;
  wordCount: number;
  /** The label on this part, chapter or scene, if any. */
  labelId: string | null;
}

export interface SceneDetail {
  id: string;
  title: string;
  summary: string | null;
  content: DocNode;
  wordCount: number;
  updatedAt: Date;
}

export interface BookNode extends ManuscriptNodeSummary {
  content: DocNode | null;
}

export interface WordStats {
  totalWords: number;
  /** Total words at the start of today; null until the first save today. */
  startWords: number | null;
}

export interface SceneNoteItem {
  id: string;
  /** Empty when the note has no title. */
  title: string;
  content: string;
}
