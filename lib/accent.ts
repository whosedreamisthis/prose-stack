export interface AccentTokens {
  primary: string;
  primaryForeground: string;
  ring: string;
}

/** The dark theme's `--background` (oklch(0.27 0 0)) as hex; accents are lightened until they read on it. */
export const ACCENT_BACKGROUND = "#2b2b2b";
const MIN_CONTRAST = 4.5;
const FOREGROUNDS = ["#0a0a0a", "#ffffff"] as const;

type Rgb = [number, number, number];

function parseHex(hex: string): Rgb | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function toHex([r, g, b]: Rgb) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function luminance([r, g, b]: Rgb) {
  const [lr, lg, lb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** WCAG contrast ratio between two #rrggbb colors. */
export function contrastRatio(a: string, b: string) {
  const [la, lb] = [luminance(parseHex(a)!), luminance(parseHex(b)!)];
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [nr, ng, nb] = [r / 255, g / 255, b / 255];
  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === nr) h = (ng - nb) / d + (ng < nb ? 6 : 0);
  else if (max === ng) h = (nb - nr) / d + 2;
  else h = (nr - ng) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb([h, s, l]: [number, number, number]): Rgb {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number) => {
    const x = (t + 1) % 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [channel(h + 1 / 3) * 255, channel(h) * 255, channel(h - 1 / 3) * 255];
}

/**
 * Accent tokens for the dark theme derived from a project's cover color.
 * Keeps the cover's hue and lightens it until it reads on the dark background.
 * Returns null for anything that is not a #rrggbb color, so callers fall back to the default palette.
 */
export function getAccentTokens(coverColor: string): AccentTokens | null {
  const rgb = parseHex(coverColor);
  if (!rgb) return null;

  const [h, s, l] = rgbToHsl(rgb);
  let primary = toHex(rgb);
  for (let lightness = l; contrastRatio(primary, ACCENT_BACKGROUND) < MIN_CONTRAST && lightness < 1; ) {
    lightness = Math.min(1, lightness + 0.01);
    primary = toHex(hslToRgb([h, s, lightness]));
  }

  const primaryForeground = FOREGROUNDS.reduce((best, c) =>
    contrastRatio(c, primary) > contrastRatio(best, primary) ? c : best,
  );
  return { primary, primaryForeground, ring: primary };
}

/** CSS for the server-rendered <style>. Every value is validated hex, so nothing user-controlled reaches the stylesheet. */
export function accentCss({ primary, primaryForeground, ring }: AccentTokens) {
  return `:root.dark{--primary:${primary};--primary-foreground:${primaryForeground};--ring:${ring}}`;
}

const TOKEN_VARS = { primary: "--primary", primaryForeground: "--primary-foreground", ring: "--ring" } as const;

/** Applies (or, with null, clears) the accent on <html> immediately, for in-app navigation. Browser only. */
export function applyAccent(tokens: AccentTokens | null) {
  const style = document.documentElement.style;
  for (const [key, cssVar] of Object.entries(TOKEN_VARS)) {
    if (tokens) style.setProperty(cssVar, tokens[key as keyof AccentTokens]);
    else style.removeProperty(cssVar);
  }
}
