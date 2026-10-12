import { z } from "zod";
import { updateProjectSchema } from "@/lib/project-config";
import type { ThemeChoice } from "@/lib/theme-config";

export const SETTINGS_TABS = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number]["id"];

/** Every setting the modal edits. `theme` belongs to the user; the rest belong to the project. */
export interface SettingsValues {
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
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, "Nothing to save.");

export type UpdateProjectSettingsInput = z.input<typeof updateProjectSettingsSchema>;

export interface SettingsChanges {
  project: UpdateProjectSettingsInput;
  /** Present only when the theme changed; `null` clears the choice. */
  theme?: ThemeChoice | null;
}

/** What differs between the saved values and the draft. Text is compared trimmed, as it is saved. */
export function getChanges(saved: SettingsValues, draft: SettingsValues): SettingsChanges {
  const project: UpdateProjectSettingsInput = {};
  for (const key of ["title", "subtitle", "author"] as const) {
    if (draft[key].trim() !== saved[key].trim()) project[key] = draft[key];
  }
  return draft.theme !== saved.theme ? { project, theme: draft.theme } : { project };
}

export function hasChanges({ project, theme }: SettingsChanges) {
  return Object.keys(project).length > 0 || theme !== undefined;
}

/** Which tabs hold unsaved edits, for the dot in the tab strip. */
export function getDirtyTabs(saved: SettingsValues, draft: SettingsValues): Record<SettingsTab, boolean> {
  const { project, theme } = getChanges(saved, draft);
  return { general: Object.keys(project).length > 0, appearance: theme !== undefined };
}

/** The tabs with a default to go back to; General has none. */
export const RESETTABLE_TABS: readonly SettingsTab[] = ["appearance"];

/** The draft with one tab's settings put back to their defaults. */
export function resetTab(draft: SettingsValues, tab: SettingsTab): SettingsValues {
  return tab === "appearance" ? { ...draft, theme: null } : draft;
}
