import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { SKELETON_DELAY_MS, usePendingNavStore } from "@/lib/stores/pending-nav-store";

const initial = usePendingNavStore.getState();

describe("pending navigation store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePendingNavStore.setState(initial, true);
  });

  afterEach(() => {
    usePendingNavStore.getState().setPending("scene", null);
    vi.useRealTimers();
  });

  it("holds the skeleton back until the wait has lasted a moment", () => {
    usePendingNavStore.getState().setPending("scene", "s1");
    expect(usePendingNavStore.getState().visible.scene).toBe(false);
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    expect(usePendingNavStore.getState().visible.scene).toBe(true);
  });

  it("never shows a skeleton for a page that arrives in time", () => {
    usePendingNavStore.getState().setPending("scene", "s1");
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    usePendingNavStore.getState().setPending("scene", null); // the page arrived
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    expect(usePendingNavStore.getState().visible.scene).toBe(false);
  });

  it("restarts the wait when another item is clicked", () => {
    usePendingNavStore.getState().setPending("character", "c1");
    vi.advanceTimersByTime(SKELETON_DELAY_MS - 10);
    usePendingNavStore.getState().setPending("character", "c2");
    vi.advanceTimersByTime(20);
    expect(usePendingNavStore.getState().visible.character).toBe(false);
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    expect(usePendingNavStore.getState().visible.character).toBe(true);
  });

  it("tracks each kind on its own", () => {
    usePendingNavStore.getState().setPending("section", "characters");
    vi.advanceTimersByTime(SKELETON_DELAY_MS);
    expect(usePendingNavStore.getState().visible).toEqual({ character: false, place: false, scene: false, item: false, section: true, node: false });
  });
});
