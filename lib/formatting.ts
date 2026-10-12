import type { CSSProperties } from "react";
import { DEFAULT_FORMATTING, FONTS, LINE_SPACING_OPTIONS, type Formatting, type FontName } from "@/lib/project-config";

/** The font-family value for a font name; an unknown name falls back to the default font. */
export function fontCss(name: string) {
  return (FONTS.find((f) => f.name === name) ?? FONTS[0]).css;
}

/** Keeps only the formatting fields (and any unknown value falls back to the default), so rows and drafts are safe to pass in. */
export function toFormatting(source: { fontFamily: string; fontSize: number; lineSpacing: string }): Formatting {
  const fontFamily = (FONTS.some((f) => f.name === source.fontFamily) ? source.fontFamily : DEFAULT_FORMATTING.fontFamily) as FontName;
  const lineSpacing = LINE_SPACING_OPTIONS.some((o) => o.value === source.lineSpacing)
    ? (source.lineSpacing as Formatting["lineSpacing"])
    : DEFAULT_FORMATTING.lineSpacing;
  return { fontFamily, fontSize: source.fontSize, lineSpacing };
}

/**
 * The CSS variables the editor and book view read (`--editor-font`, `--editor-size`, `--editor-leading`, `--editor-gap`).
 * Setting them on a container restyles its text with no remount.
 */
export function formattingStyle({ fontFamily, fontSize, lineSpacing }: Formatting): CSSProperties {
  const spacing = LINE_SPACING_OPTIONS.find((o) => o.value === lineSpacing) ?? LINE_SPACING_OPTIONS[2];
  return {
    "--editor-font": fontCss(fontFamily),
    "--editor-size": `${fontSize}pt`,
    "--editor-leading": String(spacing.leading),
    "--editor-gap": spacing.paragraphGap,
  } as CSSProperties;
}

/** Classes that apply those variables to a container's text. */
export const FORMATTED_TEXT =
  "[font-family:var(--editor-font)] [font-size:var(--editor-size)] [line-height:var(--editor-leading)]";
