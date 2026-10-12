import path from "node:path";
import type { FontName } from "@/lib/project-config";

/**
 * The @fontsource package behind each project font. Georgia and Times New Roman are system fonts, so the PDF embeds
 * their metric-compatible stand-ins (Gelasio, Tinos): the same line breaks and page counts as on screen.
 */
export const FONT_PACKAGES: Record<FontName, string> = {
  Georgia: "gelasio",
  "Times New Roman": "tinos",
  "Libre Baskerville": "libre-baskerville",
  Lora: "lora",
  Merriweather: "merriweather",
  "EB Garamond": "eb-garamond",
  "Crimson Pro": "crimson-pro",
  "Source Serif 4": "source-serif-4",
  "Open Sans": "open-sans",
  "Atkinson Hyperlegible": "atkinson-hyperlegible",
  "Courier Prime": "courier-prime",
  Cousine: "cousine",
};

export type BookFontStyle = { bold?: boolean; italic?: boolean };

/** The font file for a project font and style (Latin subset, regular and bold, upright and italic). */
export function fontFile(name: FontName, { bold, italic }: BookFontStyle = {}) {
  const slug = FONT_PACKAGES[name];
  const file = `${slug}-latin-${bold ? 700 : 400}-${italic ? "italic" : "normal"}.woff`;
  return path.join(process.cwd(), "node_modules", "@fontsource", slug, "files", file);
}

/** The registered name of a style of the embedded book font. */
export function bookFontName({ bold, italic }: BookFontStyle = {}) {
  return `Book${bold ? "-Bold" : ""}${italic ? "-Italic" : ""}`;
}

/** Embeds the four styles of a project font into the document under the `Book*` names. */
export function registerBookFonts(doc: PDFKit.PDFDocument, name: FontName) {
  for (const bold of [false, true]) {
    for (const italic of [false, true]) doc.registerFont(bookFontName({ bold, italic }), fontFile(name, { bold, italic }));
  }
}
