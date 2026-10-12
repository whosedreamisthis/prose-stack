import { z } from "zod";

const idSchema = z.string().min(1).max(64);

export const trashRefSchema = z.object({
  projectId: idSchema,
  kind: z.enum(["node", "character", "place", "characterNote", "placeNote", "sceneNote"]),
  id: idSchema,
});

export const archiveRefSchema = z.object({
  projectId: idSchema,
  kind: z.enum(["character", "place"]),
  id: idSchema,
});

export type TrashRef = z.input<typeof trashRefSchema>;
export type ArchiveRef = z.input<typeof archiveRefSchema>;

/** The note text shown as a row title in Trash, cut short. */
export function noteLabel(note: { title: string | null; content: string }) {
  const text = note.title?.trim() || note.content.trim().replace(/\s+/g, " ");
  return text.length > 60 ? `${text.slice(0, 57)}…` : text || "Untitled note";
}

const ITEM_KINDS = ["node", "character", "place", "characterNote", "placeNote", "sceneNote"] as const;

/** The `?item=` value that opens a trashed or archived item: `<kind>:<id>`. */
export function itemParam(kind: (typeof ITEM_KINDS)[number], id: string) {
  return `${kind}:${id}`;
}

/** Reads an `?item=` value back. Anything that is not a known kind and a plausible id is null, so a hand-edited URL shows the list. */
export function parseItemParam(value: string | string[] | undefined | null) {
  const raw = Array.isArray(value) ? value[0] : value;
  const index = raw?.indexOf(":") ?? -1;
  if (!raw || index < 1) return null;
  const kind = raw.slice(0, index);
  const id = raw.slice(index + 1);
  if (!(ITEM_KINDS as readonly string[]).includes(kind) || id.length === 0 || id.length > 64) return null;
  return { kind: kind as (typeof ITEM_KINDS)[number], id };
}
