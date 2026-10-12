import { bookFontName, registerBookFonts } from "@/lib/pdf/fonts";
import { buildPdf, printable } from "@/lib/pdf/document";
import type { BookItem } from "@/lib/book/content";
import { PAGE, TEXT_WIDTH, paginate, type BookMeta, type BookPage, type Measure } from "@/lib/book/paginate";
import { LINE_SPACING_OPTIONS, type Formatting } from "@/lib/project-config";

const HEADER_COLOR = "#808080";

/** Draws one page of the layout: its lines, running header and page number, at the positions the layout decided. */
function drawPage(doc: PDFKit.PDFDocument, page: BookPage, leading: number) {
  for (const line of page.lines) {
    const widths = line.runs.map((run) => {
      doc.font(bookFontName(run)).fontSize(line.size);
      return doc.widthOfString(printable(run.text));
    });
    const total = widths.reduce((sum, w) => sum + w, 0);
    let x = PAGE.margin + line.indent + (line.align === "center" ? (TEXT_WIDTH - line.indent - total) / 2 : 0);
    // The layout gives the top of a line box of `leading` points; the text sits in the middle of it, as on screen.
    doc.font(bookFontName()).fontSize(line.size);
    const y = PAGE.margin + line.y + (leading - doc.currentLineHeight()) / 2;
    line.runs.forEach((run, i) => {
      doc.font(bookFontName(run)).fontSize(line.size).fillColor("black");
      doc.text(printable(run.text), x, y, { lineBreak: false });
      x += widths[i];
    });
  }
  if (page.header) {
    doc.font(bookFontName()).fontSize(9).fillColor(HEADER_COLOR);
    doc.text(printable(page.header).toUpperCase(), 0, 24, { width: PAGE.width, align: "center", lineBreak: false, characterSpacing: 0.5 });
  }
  if (page.folio !== null) {
    doc.font(bookFontName()).fontSize(10).fillColor(HEADER_COLOR);
    doc.text(String(page.folio), 0, PAGE.height - 24 - doc.currentLineHeight(), { width: PAGE.width, align: "center", lineBreak: false });
  }
}

/**
 * The whole book as a PDF: the Book view's pages, from the same `paginate`, in the project's embedded font. Always light
 * (black on white). Pages are 6 x 9 in; the layout supplies every position, so nothing here flows or breaks on its own.
 */
export function renderBookPdf(meta: BookMeta, items: BookItem[], formatting: Formatting) {
  return buildPdf(
    (doc) => {
      registerBookFonts(doc, formatting.fontFamily);
      const measure: Measure = (text, style, size) => {
        doc.font(bookFontName(style)).fontSize(size);
        return doc.widthOfString(printable(text));
      };
      const spacing = LINE_SPACING_OPTIONS.find((o) => o.value === formatting.lineSpacing) ?? LINE_SPACING_OPTIONS[2];
      const layout = paginate(meta, items, formatting, measure);
      layout.pages.forEach((page, i) => {
        if (i > 0) doc.addPage();
        drawPage(doc, page, formatting.fontSize * spacing.leading);
      });
    },
    { size: [PAGE.width, PAGE.height], margin: 0 },
  );
}
