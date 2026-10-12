import { describe, expect, it } from "vitest";
import { renderManuscriptPdf, sceneBlocks, pdfFontFamily } from "@/lib/pdf/manuscript";
import { renderSketchPdf } from "@/lib/pdf/sketch";
import { DEFAULT_FORMATTING } from "@/lib/project-config";
import { docFromText } from "@/lib/manuscript-text";

const isPdf = (buf: Buffer) => buf.subarray(0, 5).toString() === "%PDF-";
const pages = (buf: Buffer) => (buf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;

describe("renderSketchPdf", () => {
  it("renders a name-only sketch", async () => {
    expect(isPdf(await renderSketchPdf({ projectTitle: "Book", name: "Mara", fields: [], notes: [] }))).toBe(true);
  });

  it("renders fields, related characters and notes", async () => {
    const pdf = await renderSketchPdf({
      projectTitle: "Book",
      name: "Lighthouse",
      subtitle: "Main character",
      fields: [{ label: "Description", text: "Tall and white." }],
      related: ["Mara", "Edric"],
      notes: [{ title: "Idea", content: "x" }, { title: "", content: "y" }],
    });
    expect(isPdf(pdf)).toBe(true);
  });
});

describe("sceneBlocks", () => {
  it("keeps bold and italic runs and indents quotes", () => {
    const blocks = sceneBlocks({
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a" }, { type: "text", text: "b", marks: [{ type: "bold" }] }] },
        { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "q", marks: [{ type: "italic" }] }] }] },
        { type: "paragraph" },
      ],
    });
    expect(blocks[0].runs).toEqual([
      { text: "a", bold: false, italic: false },
      { text: "b", bold: true, italic: false },
    ]);
    expect(blocks[1].indent).toBeGreaterThan(0);
    expect(blocks[2].runs).toEqual([]);
  });
});

describe("pdfFontFamily", () => {
  it("maps font groups to built-in families", () => {
    expect(pdfFontFamily("Georgia")).toBe("Times");
    expect(pdfFontFamily("Open Sans")).toBe("Helvetica");
    expect(pdfFontFamily("Courier Prime")).toBe("Courier");
    expect(pdfFontFamily("Unknown")).toBe("Times");
  });
});

describe("renderManuscriptPdf", () => {
  it("exports an empty scene as one blank page", async () => {
    const pdf = await renderManuscriptPdf(DEFAULT_FORMATTING, [{ kind: "scene", doc: null }]);
    expect(isPdf(pdf)).toBe(true);
    expect(pages(pdf)).toBe(1);
  });

  it("renders titles and several scenes", async () => {
    const pdf = await renderManuscriptPdf(DEFAULT_FORMATTING, [
      { kind: "title", text: "Part One", level: 1 },
      { kind: "title", text: "Chapter 1", level: 2 },
      { kind: "scene", doc: docFromText("First scene.") },
      { kind: "scene", doc: docFromText("Second scene.") },
    ]);
    expect(isPdf(pdf)).toBe(true);
  });

  it("exports a 20,000-word scene quickly", async () => {
    const paragraph = Array.from({ length: 100 }, (_, i) => `word${i}`).join(" ");
    const doc = { type: "doc", content: Array.from({ length: 200 }, () => ({ type: "paragraph", content: [{ type: "text", text: paragraph }] })) };
    const started = Date.now();
    const pdf = await renderManuscriptPdf(DEFAULT_FORMATTING, [{ kind: "scene", doc }]);
    expect(isPdf(pdf)).toBe(true);
    expect(pages(pdf)).toBeGreaterThan(10);
    expect(Date.now() - started).toBeLessThan(10_000);
  });
});
