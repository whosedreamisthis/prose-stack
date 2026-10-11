import { describe, it, expect } from "vitest";
import {
  applyMove,
  BOOK_DROP_ID,
  planMove,
  resolveActiveScene,
  resolveDrop,
  sceneOrder,
  type TreeNode,
} from "@/lib/manuscript-tree";

const node = (id: string, type: TreeNode["type"], parentId: string | null, position: number): TreeNode => ({
  id,
  type,
  parentId,
  position,
  title: id,
});

const nodes: TreeNode[] = [
  node("c1", "CHAPTER", null, 0),
  node("s1", "SCENE", "c1", 0),
  node("s2", "SCENE", "c1", 1),
  node("s3", "SCENE", "c1", 2),
  node("c2", "CHAPTER", null, 1),
  node("s4", "SCENE", "c2", 0),
];

describe("planMove", () => {
  it("reorders within a parent", () => {
    const plan = planMove(nodes, "s3", "c1", 0);
    if ("error" in plan) throw new Error(plan.error);
    const moved = applyMove(nodes, plan);
    expect(sceneOrder(moved).map((n) => n.id)).toEqual(["s3", "s1", "s2", "s4"]);
  });

  it("moves a scene to another chapter and closes the gap behind it", () => {
    const plan = planMove(nodes, "s1", "c2", 1);
    if ("error" in plan) throw new Error(plan.error);
    const moved = applyMove(nodes, plan);
    expect(sceneOrder(moved).map((n) => n.id)).toEqual(["s2", "s3", "s4", "s1"]);
    expect(moved.find((n) => n.id === "s2")?.position).toBe(0);
    expect(moved.find((n) => n.id === "s3")?.position).toBe(1);
  });

  it("clamps an index past the end", () => {
    const plan = planMove(nodes, "s1", "c2", 99);
    if ("error" in plan) throw new Error(plan.error);
    expect(applyMove(nodes, plan).find((n) => n.id === "s1")?.position).toBe(1);
  });

  it("rejects a scene directly under the book", () => {
    expect(planMove(nodes, "s1", null, 0)).toEqual({ error: "That item can't go there." });
  });

  it("rejects a chapter under a scene", () => {
    expect(planMove(nodes, "c1", "s4", 0)).toEqual({ error: "That item can't go there." });
  });

  it("rejects missing nodes and destinations", () => {
    expect(planMove(nodes, "nope", "c1", 0)).toEqual({ error: "Item not found." });
    expect(planMove(nodes, "s1", "nope", 0)).toEqual({ error: "Destination not found." });
  });

  it("only touches nodes whose position changes", () => {
    const plan = planMove(nodes, "s3", "c1", 2);
    if ("error" in plan) throw new Error(plan.error);
    expect(plan.updates.map((u) => u.id)).toEqual(["s3"]);
  });
});

describe("resolveActiveScene", () => {
  it("opens the requested scene, else the first scene in the book", () => {
    expect(resolveActiveScene(nodes, "s4")?.id).toBe("s4");
    expect(resolveActiveScene(nodes, "bogus")?.id).toBe("s1");
    expect(resolveActiveScene(nodes, undefined)?.id).toBe("s1");
  });

  it("returns null when there are no scenes", () => {
    expect(resolveActiveScene([node("c1", "CHAPTER", null, 0)], undefined)).toBeNull();
  });
});

describe("resolveDrop", () => {
  it("drops a scene on a scene in another chapter before it", () => {
    expect(resolveDrop(nodes, "s1", "s4")).toEqual({ parentId: "c2", index: 0 });
  });

  it("drops a scene on a chapter at the end of that chapter", () => {
    expect(resolveDrop(nodes, "s1", "c2")).toEqual({ parentId: "c2", index: 1 });
  });

  it("drops a scene on its own chapter to the end of it", () => {
    expect(resolveDrop(nodes, "s1", "c1")).toEqual({ parentId: "c1", index: 2 });
  });

  it("reorders chapters among their siblings", () => {
    expect(resolveDrop(nodes, "c2", "c1")).toEqual({ parentId: null, index: 0 });
  });

  it("moves a chapter into a part", () => {
    const withPart = [...nodes, node("p1", "PART", null, 2)];
    expect(resolveDrop(withPart, "c1", "p1")).toEqual({ parentId: "p1", index: 0 });
  });

  it("ignores meaningless drops", () => {
    expect(resolveDrop(nodes, "c1", "s4")).toBeNull();
    expect(resolveDrop(nodes, "s1", "s1")).toBeNull();
    expect(resolveDrop(nodes, "s1", "nope")).toBeNull();
  });
});

describe("resolveDrop on the book", () => {
  const withPart: TreeNode[] = [...nodes, node("p1", "PART", null, 2), node("c3", "CHAPTER", "p1", 0)];

  it("moves a chapter out of a part to the end of the book", () => {
    expect(resolveDrop(withPart, "c3", BOOK_DROP_ID)).toEqual({ parentId: null, index: 3 });
  });

  it("moves a top-level chapter to the end of the book", () => {
    expect(resolveDrop(withPart, "c1", BOOK_DROP_ID)).toEqual({ parentId: null, index: 2 });
  });

  it("moves a part to the end of the book", () => {
    expect(resolveDrop(withPart, "p1", BOOK_DROP_ID)).toEqual({ parentId: null, index: 2 });
  });

  it("does not let a scene sit directly in the book", () => {
    expect(resolveDrop(withPart, "s1", BOOK_DROP_ID)).toBeNull();
  });

  it("plans a chapter leaving its part", () => {
    const drop = resolveDrop(withPart, "c3", BOOK_DROP_ID)!;
    const plan = planMove(withPart, "c3", drop.parentId, drop.index);
    expect("error" in plan).toBe(false);
    const moved = applyMove(withPart, plan as { updates: { id: string; parentId: string | null; position: number }[] });
    expect(moved.find((n) => n.id === "c3")).toMatchObject({ parentId: null, position: 3 });
  });
});
