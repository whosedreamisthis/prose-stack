import { z } from "zod";

const idSchema = z.string().min(1).max(64);
const clientIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional();

export const MAX_LABELS = 20;
export const MAX_LABEL_NAME_LENGTH = 40;
export const DUPLICATE_LABEL = "A label with that name already exists.";

/** Colors that read on both the light and the dark theme. */
export const LABEL_PRESETS = [
  { name: "Red", color: "#dc2626" },
  { name: "Orange", color: "#ea580c" },
  { name: "Gold", color: "#ca8a04" },
  { name: "Green", color: "#16a34a" },
  { name: "Teal", color: "#0d9488" },
  { name: "Blue", color: "#2563eb" },
  { name: "Purple", color: "#7c3aed" },
  { name: "Pink", color: "#db2777" },
  { name: "Slate", color: "#64748b" },
] as const;
export const DEFAULT_LABEL_COLOR = LABEL_PRESETS[5].color;

export const labelNameSchema = z.string().trim().min(1, "Name is required").max(MAX_LABEL_NAME_LENGTH, `Name must be ${MAX_LABEL_NAME_LENGTH} characters or fewer`);
export const labelColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must look like #1a2b3c")
  .transform((c) => c.toLowerCase());

/** The key names are unique by: trimmed and case-folded. */
export const labelNameKey = (name: string) => name.trim().toLowerCase();

export const createLabelSchema = z.object({ projectId: idSchema, name: labelNameSchema, color: labelColorSchema, id: clientIdSchema });
export const renameLabelSchema = z.object({ projectId: idSchema, labelId: idSchema, name: labelNameSchema });
export const recolorLabelSchema = z.object({ projectId: idSchema, labelId: idSchema, color: labelColorSchema });
export const labelRefSchema = z.object({ projectId: idSchema, labelId: idSchema });
export const setNodeLabelSchema = z.object({ projectId: idSchema, nodeId: idSchema, labelId: idSchema.nullable() });

/** Relative luminance of a #rrggbb color (WCAG). */
function luminance(hex: string) {
  const channel = (i: number) => {
    const v = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

/** WCAG contrast ratio between two #rrggbb colors, 1 to 21. */
export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The app's page colors in each theme, which a label color has to stand out from. */
const BACKGROUNDS = ["#ffffff", "#2b2b2b"] as const;
const MIN_CONTRAST = 1.6;

/** True when a color is too close to the page background in the light or the dark theme to see well. */
export function isLowContrast(color: string) {
  return BACKGROUNDS.some((bg) => contrastRatio(color, bg) < MIN_CONTRAST);
}

export type CreateLabelInput = z.input<typeof createLabelSchema>;
