import { z } from "zod";

export const MAX_NOTE_LENGTH = 5000;
export const MAX_NOTE_TITLE_LENGTH = 120;
export const NOTE_EMPTY = "A note can't be empty";

export const noteTitleSchema = z.string().trim().max(MAX_NOTE_TITLE_LENGTH, `Titles must be ${MAX_NOTE_TITLE_LENGTH} characters or fewer`);
export const noteContentSchema = z.string().trim().max(MAX_NOTE_LENGTH, `Notes must be ${MAX_NOTE_LENGTH} characters or fewer`);

/** A note needs a title or some text; with neither it is just an empty box. Checked after trimming. */
export const hasNoteText = (note: { title?: string; content?: string }) => !!(note.title || note.content);
