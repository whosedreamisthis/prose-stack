import { z } from "zod";

export const DEFAULT_PLACE_NAME = "New place";
export const MAX_FIELD_LENGTH = 5000;
export const MAX_RELATED_CHARACTERS = 100;

export type PlaceField = "location" | "roleInStory" | "season" | "uniqueFeatures" | "description" | "sights" | "sounds" | "smell";

/** The card's fields in display order. `short` fields are one line; the rest are paragraphs. */
export const PLACE_FIELDS: { key: PlaceField; label: string; short?: boolean }[] = [
  { key: "location", label: "Location", short: true },
  { key: "roleInStory", label: "Role", short: true },
  { key: "season", label: "Season", short: true },
  { key: "uniqueFeatures", label: "Unique features" },
  { key: "description", label: "Description" },
  { key: "sights", label: "Sights" },
  { key: "sounds", label: "Sounds" },
  { key: "smell", label: "Smell" },
];

const idSchema = z.string().min(1).max(64);
const clientIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional();

export const placeNameSchema = z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer");

const fieldValueSchema = z.string().max(MAX_FIELD_LENGTH, `Must be ${MAX_FIELD_LENGTH} characters or fewer`);

export const createPlaceSchema = z.object({
  projectId: idSchema,
  /** Optional id chosen by the client, so the new row can be shown before the server answers. */
  id: clientIdSchema,
});

export const updatePlaceSchema = z.object({
  projectId: idSchema,
  placeId: idSchema,
  changes: z
    .object({
      name: placeNameSchema,
      location: fieldValueSchema,
      roleInStory: fieldValueSchema,
      season: fieldValueSchema,
      uniqueFeatures: fieldValueSchema,
      description: fieldValueSchema,
      sights: fieldValueSchema,
      sounds: fieldValueSchema,
      smell: fieldValueSchema,
    })
    .partial()
    .strict()
    .refine((c) => Object.keys(c).length > 0, "Nothing to save"),
});

export const placeRefSchema = z.object({ projectId: idSchema, placeId: idSchema });

export const setPlaceCharactersSchema = z.object({
  projectId: idSchema,
  placeId: idSchema,
  characterIds: z.array(idSchema).max(MAX_RELATED_CHARACTERS),
});

export type CreatePlaceInput = z.input<typeof createPlaceSchema>;
export type UpdatePlaceInput = z.input<typeof updatePlaceSchema>;
export type PlaceChanges = UpdatePlaceInput["changes"];

export const MAX_NOTES_PER_PLACE = 100;
export const MAX_NOTE_LENGTH = 5000;

export const noteContentSchema = z
  .string()
  .trim()
  .min(1, "A note can't be empty")
  .max(MAX_NOTE_LENGTH, `Notes must be ${MAX_NOTE_LENGTH} characters or fewer`);

export const createNoteSchema = z.object({ projectId: idSchema, placeId: idSchema, content: noteContentSchema, id: clientIdSchema });
export const updateNoteSchema = z.object({ projectId: idSchema, placeId: idSchema, noteId: idSchema, content: noteContentSchema });
export const deleteNoteSchema = z.object({ projectId: idSchema, placeId: idSchema, noteId: idSchema });
