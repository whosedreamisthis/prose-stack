import { create } from "zustand";

/** What a click is waiting on: the `?character=`, `?place=`, `?scene=` or `?item=` (a trashed or archived item) on a page, or a whole `section` (a route segment). */
export type PendingKind = "character" | "place" | "scene" | "item" | "section" | "node" | "plot";

/**
 * How long a click may wait before its skeleton shows. A page the browser already has arrives within a frame or two, and a
 * skeleton that flashes for that long looks like a glitch; a real wait (a first visit) is longer than this and gets one.
 */
export const SKELETON_DELAY_MS = 120;

interface PendingNavStore {
  /** The item the writer just clicked, until the page for it has arrived. */
  pending: Record<PendingKind, string | null>;
  /** Whether that wait has lasted long enough to show a skeleton. Always false when nothing is pending. */
  visible: Record<PendingKind, boolean>;
  setPending: (kind: PendingKind, id: string | null) => void;
}

const timers: Partial<Record<PendingKind, ReturnType<typeof setTimeout>>> = {};

/**
 * What a sidebar list should show as selected while a click is on its way: the item just clicked in one of its own `kinds`
 * at once, nothing when the click was in another list (so two lists never show a selection together), and otherwise the
 * item the page has open (`active`, null when the page is not this list's).
 */
export function useOptimisticActive(kinds: PendingKind[], active: string | null): string | null {
  const mine = usePendingNavStore((s) => kinds.map((k) => s.pending[k]).find((id) => id !== null) ?? null);
  const other = usePendingNavStore((s) =>
    (Object.keys(s.pending) as PendingKind[]).some((k) => k !== "section" && !kinds.includes(k) && s.pending[k] !== null),
  );
  return mine ?? (other ? null : active);
}

export const usePendingNavStore = create<PendingNavStore>((set) => ({
  pending: { character: null, place: null, scene: null, item: null, section: null, node: null, plot: null },
  visible: { character: false, place: false, scene: false, item: false, section: false, node: false, plot: false },
  setPending: (kind, id) => {
    clearTimeout(timers[kind]);
    set((s) => ({ pending: { ...s.pending, [kind]: id }, visible: { ...s.visible, [kind]: false } }));
    if (id === null) return;
    timers[kind] = setTimeout(() => {
      // Only if this is still the click being waited on.
      set((s) => (s.pending[kind] === id ? { visible: { ...s.visible, [kind]: true } } : s));
    }, SKELETON_DELAY_MS);
  },
}));
