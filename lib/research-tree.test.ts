import { describe, it, expect } from "vitest";
import {
  RESEARCH_ROOT_DROP_ID,
  closeGap,
  folderDepth,
  folderDragId,
  folderMoveError,
  folderSubtree,
  itemDragId,
  parseDragId,
  planFolderDelete,
  reorder,
  resolveResearchDrop,
  subtreeHeight,
} from "@/lib/research-tree";

// a > b > c, and d at the top level.
const folders = [
  { id: "a", parentId: null, position: 0 },
  { id: "b", parentId: "a", position: 0 },
  { id: "c", parentId: "b", position: 0 },
  { id: "d", parentId: null, position: 1 },
];
const items = [
  { id: "i1", folderId: null, position: 0 },
  { id: "i2", folderId: null, position: 1 },
  { id: "i3", folderId: "a", position: 0 },
];

describe("folder shape", () => {
  it("lists a folder's subtree, parents first", () => {
    expect(folderSubtree(folders, "a")).toEqual(["a", "b", "c"]);
    expect(folderSubtree(folders, "d")).toEqual(["d"]);
  });

  it("measures depth from the top level and the height of a subtree", () => {
    expect(folderDepth(folders, null)).toBe(0);
    expect(folderDepth(folders, "a")).toBe(1);
    expect(folderDepth(folders, "c")).toBe(3);
    expect(subtreeHeight(folders, "a")).toBe(3);
    expect(subtreeHeight(folders, "d")).toBe(1);
  });

  it("stops on a cycle in bad data instead of looping", () => {
    const looped = [
      { id: "x", parentId: "y" },
      { id: "y", parentId: "x" },
    ];
    expect(folderDepth(looped, "x")).toBeLessThanOrEqual(3);
  });
});

describe("planFolderDelete", () => {
  const t = new Date("2026-10-12T10:00:00Z");
  const folder = (id: string, parentId: string | null, hidden: "trash" | "archive" | "live") => ({
    id,
    parentId,
    trashedAt: hidden === "trash" ? t : null,
    archivedAt: hidden === "archive" ? t : null,
  });
  const item = (id: string, folderId: string | null, hidden: "trash" | "archive" | "live") => ({
    id,
    folderId,
    trashedAt: hidden === "trash" ? t : null,
    archivedAt: hidden === "archive" ? t : null,
  });

  it("takes the trashed subfolders and trashed items under the root", () => {
    const plan = planFolderDelete(
      [folder("a", null, "trash"), folder("b", "a", "trash")],
      [item("i1", "a", "trash"), item("i2", "b", "trash")],
      ["a"],
    );
    expect(plan).toEqual({ folderIds: ["a", "b"], rescueFolderIds: [], rescueItemIds: [], itemIds: ["i1", "i2"] });
  });

  it("rescues what was archived inside, so deleting the folder does not take it from the Archive", () => {
    const plan = planFolderDelete(
      [folder("a", null, "trash"), folder("arch", "a", "archive"), folder("inner", "arch", "archive")],
      [item("kept", "a", "archive"), item("gone", "a", "trash"), item("deep", "inner", "archive")],
      ["a"],
    );
    expect(plan.rescueFolderIds).toEqual(["arch"]);
    expect(plan.rescueItemIds).toEqual(["kept"]);
    expect(plan.itemIds).toEqual(["gone"]);
    // The rescued folder carries its own contents, so only it moves.
    expect(plan.folderIds).toEqual(["a"]);
  });

  it("handles several roots and leaves other folders alone", () => {
    const plan = planFolderDelete(
      [folder("a", null, "trash"), folder("b", null, "trash"), folder("c", null, "live")],
      [item("i", "c", "live")],
      ["a", "b"],
    );
    expect(plan.folderIds).toEqual(["a", "b"]);
    expect(plan.itemIds).toEqual([]);
  });
});

describe("folderMoveError", () => {
  it("refuses moving a folder into itself or a descendant", () => {
    expect(folderMoveError(folders, "a", "a")).toMatch(/inside itself/);
    expect(folderMoveError(folders, "a", "c")).toMatch(/inside itself/);
  });

  it("refuses a move that would nest past the limit", () => {
    // a's subtree is 3 levels; under d (level 1) it would reach level 4: allowed. Under c (level 3) it would not be.
    expect(folderMoveError(folders, "a", "d")).toBeNull();
    expect(folderMoveError(folders, "d", "c")).toBeNull();
    const deep = [...folders, { id: "e", parentId: "c", position: 0 }];
    expect(folderMoveError(deep, "d", "e")).toMatch(/4 levels/);
  });

  it("allows moving to the top level", () => {
    expect(folderMoveError(folders, "c", null)).toBeNull();
  });
});

describe("reorder and closeGap", () => {
  it("places an id at an index among its siblings, numbering from 0", () => {
    const siblings = [
      { id: "x", position: 0 },
      { id: "y", position: 1 },
      { id: "z", position: 2 },
    ];
    expect(reorder(siblings, "z", 0)).toEqual([
      { id: "z", position: 0 },
      { id: "x", position: 1 },
      { id: "y", position: 2 },
    ]);
    expect(reorder(siblings, "new", 99).at(-1)).toEqual({ id: "new", position: 3 });
  });

  it("renumbers what is left behind, returning only rows that change", () => {
    expect(
      closeGap([
        { id: "x", position: 0 },
        { id: "z", position: 2 },
      ]),
    ).toEqual([{ id: "z", position: 1 }]);
  });
});

describe("drag ids", () => {
  it("round-trips folder, item and root ids, and rejects others", () => {
    expect(parseDragId(folderDragId("a"))).toEqual({ kind: "folder", id: "a" });
    expect(parseDragId(itemDragId("i1"))).toEqual({ kind: "item", id: "i1" });
    expect(parseDragId(RESEARCH_ROOT_DROP_ID)).toEqual({ kind: "root" });
    expect(parseDragId("node:a")).toBeNull();
    expect(parseDragId("folder:")).toBeNull();
  });
});

describe("resolveResearchDrop", () => {
  it("drops an item on a folder at the end of that folder's items", () => {
    expect(resolveResearchDrop(folders, items, itemDragId("i1"), folderDragId("a"))).toEqual({ parentId: "a", index: 1 });
  });

  it("drops an item on another item just before it", () => {
    expect(resolveResearchDrop(folders, items, itemDragId("i2"), itemDragId("i1"))).toEqual({ parentId: null, index: 0 });
    expect(resolveResearchDrop(folders, items, itemDragId("i3"), itemDragId("i2"))).toEqual({ parentId: null, index: 1 });
  });

  it("drops a folder on an item into that item's folder, after its folders", () => {
    expect(resolveResearchDrop(folders, items, folderDragId("d"), itemDragId("i3"))).toEqual({ parentId: "a", index: 1 });
  });

  it("drops anything on the top-level zone at the end of the top level", () => {
    expect(resolveResearchDrop(folders, items, folderDragId("c"), RESEARCH_ROOT_DROP_ID)).toEqual({ parentId: null, index: 2 });
    expect(resolveResearchDrop(folders, items, itemDragId("i3"), RESEARCH_ROOT_DROP_ID)).toEqual({ parentId: null, index: 2 });
  });

  it("refuses a folder dropped into its own subtree, and drops on itself", () => {
    expect(resolveResearchDrop(folders, items, folderDragId("a"), folderDragId("c"))).toBeNull();
    expect(resolveResearchDrop(folders, items, folderDragId("a"), folderDragId("a"))).toBeNull();
  });
});
