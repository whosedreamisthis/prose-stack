export interface BeatSceneLink {
  id: string;
  title: string;
}

export interface BeatState {
  covered: boolean;
  /** Live (not trashed) scenes linked to the beat, in outline order. */
  scenes: BeatSceneLink[];
}

export interface StructureData {
  templateId: string | null;
  /** Progress by beat key; a beat the writer never touched has no entry. */
  progress: Record<string, BeatState>;
}
