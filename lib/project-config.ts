import { z } from "zod";

export const MAX_PROJECTS_PER_USER = 5;

export const PROJECT_LIMIT_MESSAGE = `You can have up to ${MAX_PROJECTS_PER_USER} projects. Delete one to create another.`;

export const COVER_DESIGNS = ["classic", "modern", "minimal", "bold"] as const;
export type CoverDesign = (typeof COVER_DESIGNS)[number];

export const COVER_COLORS = [
  "#1e3a5f",
  "#7f1d1d",
  "#14532d",
  "#4c1d95",
  "#9a3412",
  "#0f172a",
  "#be185d",
  "#ca8a04",
] as const;

export const DEFAULT_COVER_DESIGN: CoverDesign = "classic";
export const DEFAULT_COVER_COLOR = COVER_COLORS[0];

export const createProjectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer"),
  subtitle: z.string().trim().max(160, "Subtitle must be 160 characters or fewer").default(""),
  author: z.string().trim().min(1, "Author is required").max(80, "Author must be 80 characters or fewer"),
  coverDesign: z.enum(COVER_DESIGNS),
  coverColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a valid color"),
});

export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = createProjectSchema.pick({ title: true, subtitle: true, author: true, coverColor: true });

export type UpdateProjectInput = z.input<typeof updateProjectSchema>;

/** Black or white, whichever reads better on the given #rrggbb background. */
export function getContrastColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#111111" : "#ffffff";
}

/** Fixed to UTC so the server render and the browser agree (no hydration mismatch). */
export function formatEditedDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export const projectIdSchema = z.string().min(1).max(64);

export const LINE_SPACINGS = ["SINGLE", "ONE_AND_HALF", "DOUBLE"] as const;
export type LineSpacing = (typeof LINE_SPACINGS)[number];

/** How the manuscript text is set. Saved per project; display only, never part of a scene's content. */
export interface Formatting {
  fontFamily: FontName;
  fontSize: number;
  lineSpacing: LineSpacing;
}

export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 18;
/** The sizes the editor toolbar offers as a shortcut; the settings tab accepts any whole size from 10 to 18. */
export const TOOLBAR_FONT_SIZES = [10, 11, 12, 13, 14, 16, 18] as const;

export const FONT_GROUPS = ["Serif", "Sans-serif", "Monospace"] as const;

/**
 * The fonts a project can use. `css` is the font-family value for the editor and book view; the `--font-*` variables are
 * the self-hosted fonts loaded in `lib/manuscript-fonts.ts`. Georgia and Times New Roman are system fonts, so the PDF
 * embeds metric-compatible stand-ins (`pdfFont`: Gelasio, Tinos) to keep line breaks and page counts the same.
 */
export const FONTS = [
  { name: "Georgia", group: "Serif", css: 'Georgia, "Times New Roman", serif', pdfFont: "Gelasio" },
  { name: "Times New Roman", group: "Serif", css: '"Times New Roman", Times, serif', pdfFont: "Tinos" },
  { name: "Libre Baskerville", group: "Serif", css: 'var(--font-libre-baskerville), Georgia, serif' },
  { name: "Lora", group: "Serif", css: 'var(--font-lora), Georgia, serif' },
  { name: "Merriweather", group: "Serif", css: 'var(--font-merriweather), Georgia, serif' },
  { name: "EB Garamond", group: "Serif", css: 'var(--font-eb-garamond), Georgia, serif' },
  { name: "Crimson Pro", group: "Serif", css: 'var(--font-crimson-pro), Georgia, serif' },
  { name: "Source Serif 4", group: "Serif", css: 'var(--font-source-serif), Georgia, serif' },
  { name: "Open Sans", group: "Sans-serif", css: 'var(--font-open-sans), Arial, sans-serif' },
  { name: "Atkinson Hyperlegible", group: "Sans-serif", css: 'var(--font-atkinson), Arial, sans-serif' },
  { name: "Courier Prime", group: "Monospace", css: 'var(--font-courier-prime), "Courier New", monospace' },
  { name: "Cousine", group: "Monospace", css: 'var(--font-cousine), "Courier New", monospace' },
] as const;

export type FontName = (typeof FONTS)[number]["name"];
export const FONT_NAMES = FONTS.map((f) => f.name) as [FontName, ...FontName[]];

export const DEFAULT_FORMATTING: Formatting = { fontFamily: "Georgia", fontSize: 12, lineSpacing: "DOUBLE" };

export const LINE_SPACING_OPTIONS: { value: LineSpacing; label: string; leading: number; paragraphGap: string }[] = [
  { value: "SINGLE", label: "Single", leading: 1.2, paragraphGap: "0.9em" },
  { value: "ONE_AND_HALF", label: "1.5", leading: 1.5, paragraphGap: "0.6em" },
  { value: "DOUBLE", label: "Double", leading: 2, paragraphGap: "0.3em" },
];

export const fontNameSchema = z.enum(FONT_NAMES, { error: "Pick one of the listed fonts" });
export const fontSizeSchema = z
  .number({ error: "Font size must be a whole number" })
  .int("Font size must be a whole number")
  .min(MIN_FONT_SIZE, `Font size must be ${MIN_FONT_SIZE} to ${MAX_FONT_SIZE}`)
  .max(MAX_FONT_SIZE, `Font size must be ${MIN_FONT_SIZE} to ${MAX_FONT_SIZE}`);
export const lineSpacingSchema = z.enum(LINE_SPACINGS, { error: "Pick single, 1.5 or double" });
