import { PAGE_MARGIN, buildPdf, fontName, printable } from "@/lib/pdf/document";

export interface SketchPdfInput {
  projectTitle: string;
  name: string;
  /** A line under the name, such as "Main character". */
  subtitle?: string;
  /** Fields with text only; the caller leaves empty ones out. */
  fields: { label: string; text: string }[];
  /** Related characters of a place, by name. */
  related?: string[];
  notes: { title: string; content: string }[];
}

const BODY = 11;
const GRAY = "#6b7280";
const INK = "#111827";

/** A character sketch or place card: name, fields, related characters, then notes, in a fixed layout. */
export function renderSketchPdf(input: SketchPdfInput) {
  return buildPdf((doc) => {
    // The project title is a small header on every page. Drawing it moves the cursor, so put it back.
    const header = () => {
      const { x, y } = doc;
      doc.font(fontName("Helvetica")).fontSize(8).fillColor(GRAY);
      doc.text(printable(input.projectTitle), PAGE_MARGIN, PAGE_MARGIN / 2, {
        width: doc.page.width - PAGE_MARGIN * 2,
        lineBreak: false,
        ellipsis: true,
      });
      doc.fillColor("black");
      doc.x = x;
      doc.y = y;
    };
    header();
    doc.on("pageAdded", header);

    const heading = (text: string) => {
      doc.moveDown(0.8);
      doc.font(fontName("Helvetica", { bold: true })).fontSize(12).fillColor(INK).text(printable(text));
      doc.moveDown(0.25);
    };
    const body = (text: string) => {
      doc.font(fontName("Times")).fontSize(BODY).fillColor("black").text(printable(text), { lineGap: 3 });
    };

    doc.font(fontName("Helvetica", { bold: true })).fontSize(22).fillColor(INK).text(printable(input.name));
    if (input.subtitle) {
      doc.moveDown(0.2);
      doc.font(fontName("Helvetica")).fontSize(10).fillColor(GRAY).text(printable(input.subtitle));
    }

    for (const field of input.fields) {
      heading(field.label);
      body(field.text);
    }
    if (input.related && input.related.length > 0) {
      heading("Related characters");
      body(input.related.join(", "));
    }
    if (input.notes.length > 0) {
      doc.moveDown(1);
      doc.font(fontName("Helvetica", { bold: true })).fontSize(16).fillColor(INK).text("Notes");
      for (const note of input.notes) {
        if (note.title) heading(note.title);
        else doc.moveDown(0.6);
        body(note.content);
      }
    }
  });
}
