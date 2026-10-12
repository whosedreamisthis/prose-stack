import { SCENE_BREAK, sceneBlocks, type FontStyle, type Run } from "@/lib/book/blocks";
import type { BookItem } from "@/lib/book/content";
import { LINE_SPACING_OPTIONS, type Formatting } from "@/lib/project-config";

/** Page geometry in points: 6 x 9 in with 0.75 in margins. The screen only scales the pages. */
export const PAGE = { width: 432, height: 648, margin: 54 } as const;
export const TEXT_WIDTH = PAGE.width - PAGE.margin * 2;
export const TEXT_HEIGHT = PAGE.height - PAGE.margin * 2;

/** Width in points of `text` set in `style` at `size`. The view measures with the browser, the PDF with its own font metrics. */
export type Measure = (text: string, style: FontStyle, size: number) => number;

export interface BookMeta {
  title: string;
  subtitle: string;
  author: string;
}

export interface PageLine {
  runs: Run[];
  /** Top of the line, in points from the top of the text area. */
  y: number;
  size: number;
  align: "left" | "center";
  /** Left indent in points (quotes and lists). */
  indent: number;
}

export type PageKind = "title" | "part" | "chapter";

export interface BookPage {
  /** 1-based position in the book; with the title page alone on the right, even pages are left-hand pages. */
  number: number;
  kind: PageKind;
  lines: PageLine[];
  /** Page number printed at the bottom; null for the title page and part pages. */
  folio: number | null;
  /** Small running header; null where none is printed. */
  header: string | null;
}

export interface BookLayout {
  pages: BookPage[];
  /** Where each part and chapter starts, for "go to". */
  contents: { title: string; kind: "part" | "chapter"; page: number }[];
}

interface Token {
  text: string;
  style: FontStyle;
  /** A space follows this word. */
  space: boolean;
  /** A forced line break follows. */
  newline: boolean;
}

/** Splits styled runs into words so a line can be filled word by word. */
function tokenize(runs: Run[]): Token[] {
  const tokens: Token[] = [];
  for (const run of runs) {
    const style = { bold: run.bold, italic: run.italic };
    const lines = run.text.split("\n");
    lines.forEach((line, li) => {
      for (const part of line.split(/(\s+)/)) {
        if (part === "") continue;
        if (/^\s+$/.test(part)) {
          if (tokens.length > 0) tokens[tokens.length - 1].space = true;
        } else tokens.push({ text: part, style, space: false, newline: false });
      }
      if (li < lines.length - 1) {
        if (tokens.length === 0) tokens.push({ text: "", style, space: false, newline: true });
        else tokens[tokens.length - 1].newline = true;
      }
    });
  }
  return tokens;
}

/** Breaks styled text into lines no wider than `width` (an over-long word gets a line to itself). */
export function wrapRuns(runs: Run[], size: number, width: number, measure: Measure): Run[][] {
  const lines: Run[][] = [];
  let current: Run[] = [];
  let used = 0;
  const push = (text: string, style: FontStyle) => {
    const last = current[current.length - 1];
    if (last && !!last.bold === !!style.bold && !!last.italic === !!style.italic) last.text += text;
    else current.push({ text, bold: style.bold, italic: style.italic });
  };
  const flush = () => {
    if (current.length > 0) {
      const last = current[current.length - 1];
      last.text = last.text.trimEnd();
    }
    lines.push(current);
    current = [];
    used = 0;
  };

  for (const token of tokenize(runs)) {
    const w = measure(token.text, token.style, size);
    if (used > 0 && used + w > width) flush();
    if (token.text) {
      push(token.text, token.style);
      used += w;
    }
    if (token.newline) flush();
    else if (token.space && used > 0) {
      push(" ", token.style);
      used += measure(" ", token.style, size);
    }
  }
  if (current.length > 0) flush();
  return lines.length > 0 ? lines : [[]];
}

/**
 * Lays the book out in pages: a title page, then parts and chapters. Each part and each chapter starts on a new page, with
 * no blank pages between. Pure: the same content, formatting and `measure` always give the same pages.
 */
export function paginate(meta: BookMeta, items: BookItem[], formatting: Formatting, measure: Measure): BookLayout {
  const spacing = LINE_SPACING_OPTIONS.find((o) => o.value === formatting.lineSpacing) ?? LINE_SPACING_OPTIONS[2];
  const size = formatting.fontSize;
  const leading = size * spacing.leading;
  const gap = size * parseFloat(spacing.paragraphGap);

  const pages: BookPage[] = [];
  const contents: BookLayout["contents"] = [];

  const newPage = (kind: PageKind): BookPage => {
    const page: BookPage = { number: pages.length + 1, kind, lines: [], folio: null, header: null };
    pages.push(page);
    return page;
  };
  let y = 0;
  const centered = (page: BookPage, text: string, lineSize: number, bold: boolean, after: number) => {
    for (const runs of wrapRuns([{ text, bold }], lineSize, TEXT_WIDTH, measure)) {
      page.lines.push({ runs, y, size: lineSize, align: "center", indent: 0 });
      y += lineSize * 1.3;
    }
    y += after;
  };

  // Title page: centered in the upper half.
  const titlePage = newPage("title");
  y = TEXT_HEIGHT * 0.3;
  centered(titlePage, meta.title, size + 12, true, size);
  if (meta.subtitle) centered(titlePage, meta.subtitle, size + 2, false, size * 2);
  if (meta.author) {
    centered(titlePage, "by", size, false, size * 0.5);
    centered(titlePage, meta.author, size + 2, false, 0);
  }

  for (const item of items) {
    if (item.kind === "part") {
      const page = newPage("part");
      contents.push({ title: item.title, kind: "part", page: page.number });
      y = TEXT_HEIGHT * 0.35;
      centered(page, item.title, size + 10, true, 0);
      continue;
    }

    let page = newPage("chapter");
    contents.push({ title: item.title, kind: "chapter", page: page.number });
    y = 0;
    centered(page, item.title, size + 6, true, leading);

    /** Adds one line, starting a new page when it would not fit. */
    const place = (runs: Run[], align: PageLine["align"], indent: number) => {
      if (y + leading > TEXT_HEIGHT) {
        page = newPage("chapter");
        y = 0;
      }
      page.lines.push({ runs, y, size, align, indent });
      y += leading;
    };

    item.scenes.forEach((scene, i) => {
      if (i > 0) {
        y += gap;
        place([{ text: SCENE_BREAK }], "center", 0);
        y += gap;
      }
      for (const block of sceneBlocks(scene)) {
        const runs = block.runs.filter((r) => r.text.length > 0);
        if (runs.length === 0) {
          y += leading;
          continue;
        }
        for (const line of wrapRuns(runs, size, TEXT_WIDTH - block.indent, measure)) place(line, "left", block.indent);
        y += gap;
      }
    });
  }

  // Numbers and running headers on chapter pages only.
  for (const page of pages) {
    if (page.kind !== "chapter") continue;
    page.folio = page.number;
    page.header = meta.title;
  }
  return { pages, contents };
}
