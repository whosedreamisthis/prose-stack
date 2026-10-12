import { z } from "zod";
import {
  DEFAULT_FORMATTING,
  fontNameSchema,
  fontSizeSchema,
  lineSpacingSchema,
  updateProjectSchema,
  type Formatting,
} from "@/lib/project-config";
import type { ThemeChoice } from "@/lib/theme-config";

export const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "formatting", label: "Formatting" },
  { id: "labels", label: "Labels" },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

/** Every setting the modal edits. `theme` belongs to the user; the rest belong to the project. */
export interface SettingsValues extends Formatting {
  title: string;
  subtitle: string;
  author: string;
  theme: ThemeChoice | null;
}

const fields = updateProjectSchema.shape;

/** Only the project fields that changed; a field that is absent is left alone. */
export const updateProjectSettingsSchema = z
  .object({
    title: fields.title.optional(),
    subtitle: z.string().trim().max(160, "Subtitle must be 160 characters or fewer").optional(),
    author: fields.author.optional(),
    fontFamily: fontNameSchema.optional(),
    fontSize: fontSizeSchema.optional(),
    lineSpacing: lineSpacingSchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Nothing to save.");

export type UpdateProjectSettingsInput = z.input<typeof updateProjectSettingsSchema>;

export interface SettingsChanges {
  project: UpdateProjectSettingsInput;
  /** Present only when the theme changed; `null` clears the choice. */
  theme?: ThemeChoice | null;
}

const GENERAL_KEYS = ["title", "subtitle", "author"] as const;
const FORMATTING_KEYS = ["fontFamily", "fontSize", "lineSpacing"] as const;

/** What differs between the saved values and the draft. Text is compared trimmed, as it is saved. */
export function getChanges(saved: SettingsValues, draft: SettingsValues): SettingsChanges {
  const project: UpdateProjectSettingsInput = {};
  for (const key of GENERAL_KEYS) {
    if (draft[key].trim() !== saved[key].trim()) project[key] = draft[key];
  }
  if (draft.fontFamily !== saved.fontFamily) project.fontFamily = draft.fontFamily;
  if (draft.fontSize !== saved.fontSize) project.fontSize = draft.fontSize;
  if (draft.lineSpacing !== saved.lineSpacing) project.lineSpacing = draft.lineSpacing;
  return draft.theme !== saved.theme ? { project, theme: draft.theme } : { project };
}

export function hasChanges({ project, theme }: SettingsChanges) {
  return Object.keys(project).length > 0 || theme !== undefined;
}

/** Which tabs hold unsaved edits, for the dot in the tab strip. */
export function getDirtyTabs(saved: SettingsValues, draft: SettingsValues): Record<SettingsTab, boolean> {
  const { project, theme } = getChanges(saved, draft);
  return {
    general: GENERAL_KEYS.some((key) => key in project),
    appearance: theme !== undefined,
    formatting: FORMATTING_KEYS.some((key) => key in project),
    // Labels save on their own as they change, so they are never unsaved.
    labels: false,
  };
}

/** The tabs with a default to go back to; General has none. */
export const RESETTABLE_TABS: readonly SettingsTab[] = ["appearance", "formatting"];

/** The draft with one tab's settings put back to their defaults. */
export function resetTab(draft: SettingsValues, tab: SettingsTab): SettingsValues {
  if (tab === "appearance") return { ...draft, theme: null };
  if (tab === "formatting") return { ...draft, ...DEFAULT_FORMATTING };
  return draft;
}
