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

export const updateProjectSchema = createProjectSchema.pick({ title: true, subtitle: true, author: true });

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
