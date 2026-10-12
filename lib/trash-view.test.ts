import { describe, it, expect } from "vitest";
import { itemParam, parseItemParam } from "@/lib/trash-config";
import { nodeSections } from "@/lib/trash-view";
import { docFromText } from "@/lib/manuscript-text";

const node = (id: string, parentId: string | null, type: "PART" | "CHAPTER" | "SCENE", position: number, title = id) => ({
  id,
  parentId,
  type,
  title,
  position,
});

const nodes = [
  node("part", null, "PART", 0, "Part One"),
  node("ch2", "part", "CHAPTER", 1, "Chapter 2"),
  node("ch1", "part", "CHAPTER", 0, "Chapter 1"),
  node("s2", "ch1", "SCENE", 1),
  node("s1", "ch1", "SCENE", 0),
  node("s3", "ch2", "SCENE", 0),
];
const docs = new Map([
  ["s1", docFromText("one")],
  ["s2", docFromText("two")],
  ["s3", docFromText("three")],
]);
const all = new Set(nodes.map((n) => n.id));

describe("nodeSections", () => {
  it("shows a scene as just its text", () => {
    expect(nodeSections(nodes, "s1", all, docs)).toEqual([{ doc: docFromText("one"), text: undefined }]);
  });

  it("shows a chapter as its scenes in order, without a heading of its own", () => {
    const sections = nodeSections(nodes, "ch1", all, docs);
    expect(sections.map((s) => s.doc)).toEqual([docFromText("one"), docFromText("two")]);
    expect(sections.some((s) => s.heading)).toBe(false);
  });

  it("shows a part with each chapter's title as a heading, in order", () => {
    const sections = nodeSections(nodes, "part", all, docs);
    expect(sections.map((s) => s.heading ?? "scene")).toEqual(["Chapter 1", "scene", "scene", "Chapter 2", "scene"]);
  });

  it("leaves out what was not trashed together with the item", () => {
    const sections = nodeSections(nodes, "ch1", new Set(["ch1", "s1"]), docs);
    expect(sections).toHaveLength(1);
  });

  it("shows an empty scene as empty text and an unknown item as nothing", () => {
    expect(nodeSections(nodes, "s1", all, new Map())).toEqual([{ doc: undefined, text: "" }]);
    expect(nodeSections(nodes, "nope", all, docs)).toEqual([]);
  });
});

describe("item param", () => {
  it("round-trips a kind and an id", () => {
    expect(parseItemParam(itemParam("characterNote", "abc123"))).toEqual({ kind: "characterNote", id: "abc123" });
  });

  it("rejects an unknown kind, a missing id and junk", () => {
    for (const bad of ["project:abc", "node:", ":abc", "node", "", undefined, null, `node:${"x".repeat(65)}`]) {
      expect(parseItemParam(bad as string)).toBeNull();
    }
  });

  it("takes the first of repeated params", () => {
    expect(parseItemParam(["place:p1", "node:n1"])).toEqual({ kind: "place", id: "p1" });
  });
});
