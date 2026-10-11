import { describe, it, expect, beforeEach } from "vitest";
import { useLayoutStore } from "@/lib/stores/layout-store";

const initial = useLayoutStore.getState();

describe("layout store", () => {
  beforeEach(() => {
    useLayoutStore.setState(initial, true);
  });

  it("starts with both sidebars open, the drawer closed, and no right panel", () => {
    const s = useLayoutStore.getState();
    expect(s).toMatchObject({ leftOpen: true, rightOpen: true, drawerOpen: false, hasRightPanel: false });
  });

  it("toggles each sidebar independently", () => {
    useLayoutStore.getState().toggleLeft();
    expect(useLayoutStore.getState()).toMatchObject({ leftOpen: false, rightOpen: true });
    useLayoutStore.getState().toggleRight();
    expect(useLayoutStore.getState()).toMatchObject({ leftOpen: false, rightOpen: false });
    useLayoutStore.getState().toggleLeft();
    expect(useLayoutStore.getState().leftOpen).toBe(true);
  });

  it("keeps the mobile drawer separate from the desktop sidebar state", () => {
    useLayoutStore.getState().setDrawerOpen(true);
    expect(useLayoutStore.getState()).toMatchObject({ drawerOpen: true, leftOpen: true });
    useLayoutStore.getState().toggleLeft();
    expect(useLayoutStore.getState().drawerOpen).toBe(true);
  });

  it("remembers sidebar state across navigations within the session", () => {
    useLayoutStore.getState().toggleLeft();
    useLayoutStore.getState().setHasRightPanel(true);
    useLayoutStore.getState().setHasRightPanel(false); // a page unmounting
    expect(useLayoutStore.getState().leftOpen).toBe(false);
  });
});
