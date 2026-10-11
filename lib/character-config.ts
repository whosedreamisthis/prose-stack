import { z } from "zod";

export type CharacterRoleKey = "MAIN" | "SUPPORTING";

export const CHARACTER_ROLES: { value: CharacterRoleKey; label: string; plural: string }[] = [
  { value: "MAIN", label: "Main", plural: "Main Characters" },
  { value: "SUPPORTING", label: "Supporting", plural: "Supporting Characters" },
];

export const DEFAULT_CHARACTER_NAME = "New character";
export const MAX_NOTES_PER_CHARACTER = 100;
export const MAX_FIELD_LENGTH = 5000;
export const MAX_NOTE_LENGTH = 5000;

export type SketchField =
  | "age"
  | "location"
  | "roleInStory"
  | "goal"
  | "physicalDescription"
  | "personality"
  | "occupation"
  | "habits"
  | "background"
  | "internalConflicts"
  | "externalConflicts";

/** The sketch fields in display order. `short` fields are one line; the rest are paragraphs. */
export const SKETCH_FIELDS: { key: SketchField; label: string; short?: boolean }[] = [
  { key: "age", label: "Age", short: true },
  { key: "location", label: "Location", short: true },
  { key: "roleInStory", label: "Role", short: true },
  { key: "occupation", label: "Occupation", short: true },
  { key: "goal", label: "Goal" },
  { key: "physicalDescription", label: "Appearance" },
  { key: "personality", label: "Personality" },
  { key: "habits", label: "Habits" },
  { key: "background", label: "Background" },
  { key: "internalConflicts", label: "Internal conflicts" },
  { key: "externalConflicts", label: "External conflicts" },
];

const idSchema = z.string().min(1).max(64);
const clientIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional();

export const characterNameSchema = z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer");
const roleSchema = z.enum(["MAIN", "SUPPORTING"]);

const sketchValueSchema = z.string().max(MAX_FIELD_LENGTH, `Must be ${MAX_FIELD_LENGTH} characters or fewer`);

export const createCharacterSchema = z.object({
  projectId: idSchema,
  role: roleSchema,
  /** Optional id chosen by the client, so the new row can be shown before the server answers. */
  id: clientIdSchema,
});

export const updateCharacterSchema = z.object({
  projectId: idSchema,
  characterId: idSchema,
  changes: z
    .object({
      name: characterNameSchema,
      role: roleSchema,
      age: sketchValueSchema,
      location: sketchValueSchema,
      roleInStory: sketchValueSchema,
      goal: sketchValueSchema,
      physicalDescription: sketchValueSchema,
      personality: sketchValueSchema,
      occupation: sketchValueSchema,
      habits: sketchValueSchema,
      background: sketchValueSchema,
      internalConflicts: sketchValueSchema,
      externalConflicts: sketchValueSchema,
    })
    .partial()
    .strict()
    .refine((c) => Object.keys(c).length > 0, "Nothing to save"),
});

export const characterRefSchema = z.object({ projectId: idSchema, characterId: idSchema });

export const noteContentSchema = z.string().trim().min(1, "A note can't be empty").max(MAX_NOTE_LENGTH, `Notes must be ${MAX_NOTE_LENGTH} characters or fewer`);

export const createNoteSchema = z.object({
  projectId: idSchema,
  characterId: idSchema,
  content: noteContentSchema,
  id: clientIdSchema,
});

export const updateNoteSchema = z.object({ projectId: idSchema, characterId: idSchema, noteId: idSchema, content: noteContentSchema });
export const deleteNoteSchema = z.object({ projectId: idSchema, characterId: idSchema, noteId: idSchema });

export type CreateCharacterInput = z.input<typeof createCharacterSchema>;
export type UpdateCharacterInput = z.input<typeof updateCharacterSchema>;
export type CharacterChanges = UpdateCharacterInput["changes"];
