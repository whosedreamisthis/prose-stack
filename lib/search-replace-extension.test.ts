import { describe, expect, it } from "vitest";
import { Schema } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { findMatches, replaceMatches } from "@/lib/search-replace-extension";

const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: { content: "text*", group: "block" },
    text: {},
  },
});

function docOf(...paragraphs: string[]) {
  return schema.node(
    "doc",
    null,
    paragraphs.map((text) => schema.node("paragraph", null, text ? [schema.text(text)] : [])),
  );
}

describe("findMatches", () => {
  const doc = docOf("The cat and the Cat", "a catalogue");

  it("ignores case by default", () => {
    expect(findMatches(doc, "cat", false)).toHaveLength(3);
  });

  it("respects case when asked", () => {
    expect(findMatches(doc, "Cat", true)).toHaveLength(1);
    expect(findMatches(doc, "cat", true)).toHaveLength(2);
  });

  it("returns nothing for no match or an empty term", () => {
    expect(findMatches(doc, "dog", false)).toEqual([]);
    expect(findMatches(doc, "", false)).toEqual([]);
  });

  it("does not report overlapping matches", () => {
    expect(findMatches(docOf("aaaa"), "aa", false)).toHaveLength(2);
  });
});

describe("replaceMatches", () => {
  it("replaces every match, even when the replacement changes the length", () => {
    const doc = docOf("one two one", "one");
    const state = EditorState.create({ doc });
    const tr = replaceMatches(state.tr, findMatches(doc, "one", false), "seventeen");
    expect(tr.doc.textBetween(0, tr.doc.content.size, "|")).toBe("seventeen two seventeen|seventeen");
  });

  it("leaves the document alone when nothing matched", () => {
    const doc = docOf("hello");
    const tr = replaceMatches(EditorState.create({ doc }).tr, [], "x");
    expect(tr.docChanged).toBe(false);
  });
});
