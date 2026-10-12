import PDFDocument from "pdfkit";

/** Letter page with one-inch margins, in points. */
export const PAGE_MARGIN = 72;

/** Runs `draw` against a new document and resolves with the finished PDF. Letter with one-inch margins unless told otherwise. */
export function buildPdf(
  draw: (doc: PDFKit.PDFDocument) => void,
  { size, margin }: { size?: [number, number]; margin?: number } = {},
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: size ?? "LETTER", margin: margin ?? PAGE_MARGIN, info: { Producer: "ProseStack" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      draw(doc);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export type FontStyle = { bold?: boolean; italic?: boolean };
export type FontFamily = "Times" | "Helvetica" | "Courier";

const VARIANTS: Record<FontFamily, [regular: string, bold: string, italic: string, boldItalic: string]> = {
  Times: ["Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic"],
  Helvetica: ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"],
  Courier: ["Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique"],
};

/** The built-in PDF font for a family and style. */
export function fontName(family: FontFamily, { bold, italic }: FontStyle = {}) {
  return VARIANTS[family][(bold ? 1 : 0) + (italic ? 2 : 0)];
}

/** Control characters are dropped, so a stray one never garbles a line. */
export function printable(text: string) {
  return text.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").replace(/\t/g, "    ");
}
