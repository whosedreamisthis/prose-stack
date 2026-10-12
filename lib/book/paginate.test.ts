import { describe, expect, it } from "vitest";
import { buildBookItems, type BookItem } from "@/lib/book/content";
import { TEXT_WIDTH, paginate, wrapRuns, type Measure } from "@/lib/book/paginate";
import type { DocNode } from "@/lib/manuscript-text";
import type { BookNode } from "@/types/manuscript";

/** Every character is half the font size wide, so the tests need no fonts. */
const measure: Measure = (text, _style, size) => text.length * size * 0.5;
const formatting = { fontFamily: "Georgia", fontSize: 12, lineSpacing: "DOUBLE" } as const;
const meta = { title: "The Book", subtitle: "", author: "A. Writer" };

const doc = (...paragraphs: string[]): DocNode => ({
  type: "doc",
  content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
});
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

describe("wrapRuns", () => {
  it("breaks at the width and drops trailing spaces", () => {
    const lines = wrapRuns([{ text: "aaa bbb ccc" }], 10, 40, measure); // 8 chars per line
    expect(lines.map((l) => l.map((r) => r.text).join(""))).toEqual(["aaa bbb", "ccc"]);
  });

  it("keeps bold and italic runs and gives an over-long word its own line", () => {
    const lines = wrapRuns([{ text: "hi " }, { text: "verylongwordhere", bold: true }], 10, 40, measure);
    expect(lines).toHaveLength(2);
    expect(lines[1][0]).toMatchObject({ text: "verylongwordhere", bold: true });
  });

  it("breaks at a hard break", () => {
    expect(wrapRuns([{ text: "one\ntwo" }], 10, 400, measure)).toHaveLength(2);
  });
});

describe("paginate", () => {
  it("starts with a title page that is not numbered", () => {
    const { pages } = paginate(meta, [], formatting, measure);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({ kind: "title", number: 1, folio: null });
    const text = pages[0].lines.map((l) => l.runs.map((r) => r.text).join(""));
    expect(text).toEqual(["The Book", "by", "A. Writer"]);
  });

  it("starts each chapter on a new page with no blank pages between", () => {
    const items: BookItem[] = [
      { kind: "chapter", title: "One", scenes: [doc("hello")] },
      { kind: "chapter", title: "Two", scenes: [doc("world")] },
    ];
    const { pages, contents } = paginate(meta, items, formatting, measure);
    expect(pages.map((p) => p.kind)).toEqual(["title", "chapter", "chapter"]);
    expect(contents.map((c) => c.page)).toEqual([2, 3]);
  });

  it("continues a long chapter on following pages and numbers its pages", () => {
    const items = [{ kind: "chapter" as const, title: "One", scenes: [doc(words(2000))] }];
    const { pages } = paginate(meta, items, formatting, measure);
    const chapterPages = pages.filter((p) => p.kind === "chapter");
    expect(chapterPages.length).toBeGreaterThan(2);
    expect(chapterPages.map((p) => p.folio)).toEqual(chapterPages.map((p) => p.number));
    expect(chapterPages.every((p) => p.header === "The Book")).toBe(true);
    for (const page of chapterPages) for (const line of page.lines) expect(line.y).toBeGreaterThanOrEqual(0);
  });

  it("keeps every line inside the text width", () => {
    const items = [{ kind: "chapter" as const, title: "One", scenes: [doc(words(300))] }];
    const { pages } = paginate(meta, items, formatting, measure);
    for (const page of pages) {
      for (const line of page.lines) {
        const width = line.runs.reduce((sum, r) => sum + measure(r.text, r, line.size), 0);
        expect(width).toBeLessThanOrEqual(TEXT_WIDTH);
      }
    }
  });

  it("separates scenes with a centered scene break", () => {
    const items = [{ kind: "chapter" as const, title: "One", scenes: [doc("first"), doc("second")] }];
    const { pages } = paginate(meta, items, formatting, measure);
    const lines = pages.flatMap((p) => p.lines);
    expect(lines.some((l) => l.align === "center" && l.runs[0].text.includes("*"))).toBe(true);
  });

  it("gives a part its own unnumbered page before its first chapter", () => {
    const items = [
      { kind: "part" as const, title: "Part One" },
      { kind: "chapter" as const, title: "One", scenes: [doc("hello")] },
    ];
    const { pages, contents } = paginate(meta, items, formatting, measure);
    expect(pages.map((p) => p.kind)).toEqual(["title", "part", "chapter"]);
    expect(pages[1].folio).toBeNull();
    expect(contents).toEqual([
      { title: "Part One", kind: "part", page: 2 },
      { title: "One", kind: "chapter", page: 3 },
    ]);
  });

  it("is deterministic", () => {
    const items = [{ kind: "chapter" as const, title: "One", scenes: [doc(words(500))] }];
    expect(paginate(meta, items, formatting, measure)).toEqual(paginate(meta, items, formatting, measure));
  });
});

describe("buildBookItems", () => {
  const node = (id: string, parentId: string | null, type: BookNode["type"], position: number, content: DocNode | null = null): BookNode =>
    ({ id, parentId, type, title: id, position, wordCount: 0, content }) as BookNode;

  it("lists parts and chapters in reading order with their scenes' text", () => {
    const nodes = [
      node("c2", null, "CHAPTER", 1),
      node("p1", null, "PART", 0),
      node("c1", "p1", "CHAPTER", 0),
      node("s2", "c1", "SCENE", 1, doc("b")),
      node("s1", "c1", "SCENE", 0, doc("a")),
    ];
    const items = buildBookItems(nodes);
    expect(items.map((i) => `${i.kind}:${i.title}`)).toEqual(["part:p1", "chapter:c1", "chapter:c2"]);
    expect(items[1]).toMatchObject({ scenes: [doc("a"), doc("b")] });
  });
});
