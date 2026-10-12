import { z } from "zod";
import { MAX_NOTE_LENGTH, NOTE_EMPTY, hasNoteText, noteContentSchema, noteTitleSchema } from "@/lib/note-config";

export { MAX_NOTE_LENGTH };

const idSchema = z.string().min(1).max(64);
const clientIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional();

export const MAX_NOTES_PER_PROJECT = 100;
export const createProjectNoteSchema = z
  .object({ projectId: idSchema, title: noteTitleSchema.optional(), content: noteContentSchema, id: clientIdSchema })
  .refine(hasNoteText, NOTE_EMPTY);
export const updateProjectNoteSchema = z
  .object({ projectId: idSchema, noteId: idSchema, title: noteTitleSchema.optional(), content: noteContentSchema.optional() })
  .refine(hasNoteText, NOTE_EMPTY);
export const projectNoteRefSchema = z.object({ projectId: idSchema, noteId: idSchema });
