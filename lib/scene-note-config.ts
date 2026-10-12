import { z } from "zod";
import { MAX_NOTE_LENGTH, NOTE_EMPTY, hasNoteText, noteContentSchema, noteTitleSchema } from "@/lib/note-config";

export { MAX_NOTE_LENGTH };

const idSchema = z.string().min(1).max(64);
const clientIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional();

export const MAX_NOTES_PER_SCENE = 100;
export const createSceneNoteSchema = z
  .object({ projectId: idSchema, sceneId: idSchema, title: noteTitleSchema.optional(), content: noteContentSchema, id: clientIdSchema })
  .refine(hasNoteText, NOTE_EMPTY);
export const updateSceneNoteSchema = z
  .object({ projectId: idSchema, sceneId: idSchema, noteId: idSchema, title: noteTitleSchema.optional(), content: noteContentSchema.optional() })
  .refine(hasNoteText, NOTE_EMPTY);
export const sceneNoteRefSchema = z.object({ projectId: idSchema, sceneId: idSchema, noteId: idSchema });
