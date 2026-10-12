import { buildPdf, fontName, printable, type FontFamily, type FontStyle } from "@/lib/pdf/document";
import { FONTS, LINE_SPACING_OPTIONS, type Formatting } from "@/lib/project-config";
import type { DocNode } from "@/lib/manuscript-text";
import { SCENE_BREAK, sceneBlocks } from "@/lib/book/blocks";

export { SCENE_BREAK, sceneBlocks };

/** What a chapter or part PDF is made of, in order. */
export type ManuscriptSection = { kind: "title"; text: string; level: 1 | 2 } | { kind: "scene"; doc: DocNode | null };

/** The built-in font family closest to the project's chosen font. */
export function pdfFontFamily(name: string): FontFamily {
  const group = FONTS.find((f) => f.name === name)?.group;
  return group === "Sans-serif" ? "Helvetica" : group === "Monospace" ? "Courier" : "Times";
}

/**
 * A chapter, part or scene in the project's font, size and line spacing. Scene text only: no title page, no scene
 * titles and no page break between scenes; a centered "* * *" separates one scene from the next.
 */
export function renderManuscriptPdf(formatting: Formatting, sections: ManuscriptSection[]) {
  const family = pdfFontFamily(formatting.fontFamily);
  const spacing = LINE_SPACING_OPTIONS.find((o) => o.value === formatting.lineSpacing) ?? LINE_SPACING_OPTIONS[2];
  const size = formatting.fontSize;
  const paragraphGap = size * parseFloat(spacing.paragraphGap);

  return buildPdf((doc) => {
    const setBody = (style: FontStyle = {}) => doc.font(fontName(family, style)).fontSize(size).fillColor("black");
    setBody();
    // pdfkit adds `lineGap` to the font's own line height, so subtract that to land on the requested leading.
    const lineGap = Math.max(0, size * spacing.leading - doc.currentLineHeight());

    let started = false;
    let afterScene = false;
    for (const section of sections) {
      if (section.kind === "title") {
        if (started) doc.moveDown(1);
        doc.font(fontName(family, { bold: true })).fontSize(section.level === 1 ? size + 8 : size + 4);
        doc.text(printable(section.text), { lineGap: 0 });
        doc.moveDown(0.8);
        afterScene = false;
        started = true;
        continue;
      }
      if (afterScene) {
        setBody();
        doc.moveDown(1);
        doc.text(SCENE_BREAK, { align: "center", lineGap, paragraphGap });
        doc.moveDown(1);
      }
      for (const block of sceneBlocks(section.doc)) {
        const runs = block.runs.filter((r) => r.text.length > 0);
        if (runs.length === 0) {
          setBody();
          doc.moveDown(1);
          continue;
        }
        runs.forEach((run, i) => {
          setBody(run);
          const continued = i < runs.length - 1;
          const options = i === 0 ? { lineGap, paragraphGap, indent: block.indent, continued } : { continued };
          doc.text(printable(run.text), options);
        });
      }
      afterScene = true;
      started = true;
    }
  });
}
