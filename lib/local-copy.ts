import type { LocalCopy } from "@/lib/manuscript-sync";

export function localCopyKey(nodeId: string) {
  return `prosestack:scene:${nodeId}`;
}

export function readLocalCopy(nodeId: string): LocalCopy | null {
  try {
    const raw = window.localStorage.getItem(localCopyKey(nodeId));
    if (!raw) return null;
    const copy = JSON.parse(raw) as Partial<LocalCopy>;
    if (!copy.content || typeof copy.baseUpdatedAt !== "number" || typeof copy.dirty !== "boolean") return null;
    return copy as LocalCopy;
  } catch {
    return null;
  }
}

export function writeLocalCopy(nodeId: string, copy: LocalCopy) {
  try {
    window.localStorage.setItem(localCopyKey(nodeId), JSON.stringify(copy));
  } catch {
    // Storage can be full or blocked; the server save is still the source of truth.
  }
}
