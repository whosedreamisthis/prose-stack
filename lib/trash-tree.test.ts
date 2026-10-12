import { describe, it, expect } from "vitest";
import { trashGroupIds, trashRoots, trashedAncestorIds, type TrashNode } from "@/lib/trash-tree";

const T0 = new Date("2026-01-01T10:00:00Z");
const T1 = new Date("2026-01-02T10:00:00Z");

const node = (id: string, parentId: string | null, trashedAt: Date | null): TrashNode => ({ id, parentId, trashedAt });

describe("trashRoots", () => {
  it("lists a trashed group once, by its top node", () => {
    const nodes = [node("part", null, null), node("ch", "part", T1), node("s1", "ch", T1), node("s2", "ch", T1)];
    expect(trashRoots(nodes).map((n) => n.id)).toEqual(["ch"]);
  });

  it("lists a node that was trashed on its own before its parent", () => {
    const nodes = [node("ch", null, T1), node("s1", "ch", T0), node("s2", "ch", T1)];
    expect(trashRoots(nodes).map((n) => n.id)).toEqual(["ch", "s1"]);
  });

  it("ignores live nodes", () => {
    expect(trashRoots([node("a", null, null)])).toEqual([]);
  });
});

describe("trashGroupIds", () => {
  const nodes = [node("ch", null, T1), node("s1", "ch", T0), node("s2", "ch", T1), node("other", null, T1)];

  it("covers the node and what was trashed with it, not what was trashed earlier", () => {
    expect(trashGroupIds(nodes, "ch")).toEqual(["ch", "s2"]);
  });

  it("is empty for a live or unknown node", () => {
    expect(trashGroupIds([node("a", null, null)], "a")).toEqual([]);
    expect(trashGroupIds(nodes, "nope")).toEqual([]);
  });
});

describe("trashedAncestorIds", () => {
  it("lists trashed ancestors nearest first and stops at the first live one", () => {
    const nodes = [node("part", null, null), node("ch", "part", T1), node("s1", "ch", T0)];
    expect(trashedAncestorIds(nodes, "s1")).toEqual(["ch"]);
    const deep = [node("part", null, T1), node("ch", "part", T1), node("s1", "ch", T0)];
    expect(trashedAncestorIds(deep, "s1")).toEqual(["ch", "part"]);
  });

  it("is empty when the parent is live or there is none", () => {
    expect(trashedAncestorIds([node("part", null, null), node("ch", "part", T1)], "ch")).toEqual([]);
    expect(trashedAncestorIds([node("ch", null, T1)], "ch")).toEqual([]);
  });
});
