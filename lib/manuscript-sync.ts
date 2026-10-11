import type { DocNode } from "@/lib/manuscript-text";

/** The browser's backup copy of a scene, kept so unsaved edits survive a failed save, a reload or a stale cache. */
export interface LocalCopy {
  content: DocNode;
  /** The server's `updatedAt` (ms) when this copy was last in sync with it. */
  baseUpdatedAt: number;
  /** True while the copy has edits the server has not confirmed. */
  dirty: boolean;
}

/**
 * Which content the editor should open with. The local copy wins when it has unsaved edits on top of what the server
 * returned, or when the server's copy is older than the last save this browser saw (a stale router cache). It loses
 * when the server has moved on since, for example after an edit on another device.
 */
export function chooseInitialContent(server: { content: DocNode; updatedAt: number }, local: LocalCopy | null): DocNode {
  if (!local) return server.content;
  if (local.baseUpdatedAt > server.updatedAt) return local.content;
  if (local.baseUpdatedAt === server.updatedAt && local.dirty) return local.content;
  return server.content;
}
