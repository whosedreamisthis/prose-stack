import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { BookItem } from "@/lib/book/content";
import { FONT_PACKAGES, fontFile } from "@/lib/pdf/fonts";
import { renderBookPdf } from "@/lib/pdf/book";
import { FONTS } from "@/lib/project-config";

const doc = (text: string) => ({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });
const meta = { title: "The Book", subtitle: "A subtitle", author: "A. Writer" };
const words = Array.from({ length: 600 }, (_, i) => `word${i}`).join(" ");
const items: BookItem[] = [
  { kind: "part", title: "Part One" },
  { kind: "chapter", title: "One", scenes: [doc(words), doc("Second scene")] },
  { kind: "chapter", title: "Two", scenes: [doc("Short.")] },
];

describe("embedded fonts", () => {
  it("has all four styles of every project font on disk", () => {
    for (const { name } of FONTS) {
      expect(FONT_PACKAGES[name]).toBeTruthy();
      for (const bold of [false, true]) {
        for (const italic of [false, true]) expect(existsSync(fontFile(name, { bold, italic }))).toBe(true);
      }
    }
  });
});

describe("renderBookPdf", () => {
  it("renders a 6 x 9 in PDF with one page per laid-out page, in every project font", async () => {
    for (const { name } of FONTS) {
      const pdf = await renderBookPdf(meta, items, { fontFamily: name, fontSize: 12, lineSpacing: "DOUBLE" });
      const text = pdf.toString("latin1");
      expect(text.startsWith("%PDF-")).toBe(true);
      expect(text).toContain("/MediaBox [0 0 432 648]");
    }
  }, 30_000);

  it("renders an empty book as a title page", async () => {
    const pdf = await renderBookPdf(meta, [], { fontFamily: "Georgia", fontSize: 12, lineSpacing: "SINGLE" });
    expect((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length).toBe(1);
  });
});
