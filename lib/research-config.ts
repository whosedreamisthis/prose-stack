import { z } from "zod";

export const MAX_RESEARCH_ITEMS = 500;
export const MAX_RESEARCH_FOLDERS = 100;
/** Folders nest at most this many levels (a top-level folder is level 1). */
export const MAX_FOLDER_DEPTH = 4;
export const MAX_RESEARCH_TITLE_LENGTH = 120;
export const MAX_URL_LENGTH = 2048;
export const MAX_DESCRIPTION_LENGTH = 2000;
/** The size of a note's Tiptap document as JSON. */
export const MAX_NOTE_DOC_BYTES = 2_000_000;

export const DEFAULT_NOTE_TITLE = "New note";
export const DEFAULT_LINK_TITLE = "New link";
export const DEFAULT_FOLDER_NAME = "New folder";

/** Offered when a project has no research yet: ordinary folders for worldbuilding, which can be renamed or deleted. */
export const STARTER_FOLDERS = ["Magic & Technology", "Cultures", "History", "Geography", "Politics"] as const;

const idSchema = z.string().min(1).max(64);
const clientIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional();

export const researchTitleSchema = z
  .string()
  .trim()
  .min(1, "A name is required")
  .max(MAX_RESEARCH_TITLE_LENGTH, `Names must be ${MAX_RESEARCH_TITLE_LENGTH} characters or fewer`);

/** Whether a value is an `http` or `https` address. Other schemes (javascript:, data:, file:) are refused. */
export function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** A web address, or empty. */
export const researchUrlSchema = z
  .string()
  .trim()
  .max(MAX_URL_LENGTH, `Links must be ${MAX_URL_LENGTH} characters or fewer`)
  .refine((value) => value === "" || isWebUrl(value), "Enter a web address starting with http:// or https://");

const docSchema = z
  .object({ type: z.literal("doc") })
  .passthrough()
  .refine((doc) => JSON.stringify(doc).length <= MAX_NOTE_DOC_BYTES, "This note is too long to save.");

export const createFolderSchema = z.object({
  projectId: idSchema,
  parentId: idSchema.nullable(),
  id: clientIdSchema,
});

export const createItemSchema = z.object({
  projectId: idSchema,
  folderId: idSchema.nullable(),
  type: z.enum(["NOTE", "LINK"]),
  id: clientIdSchema,
});

export const renameFolderSchema = z.object({
  projectId: idSchema,
  folderId: idSchema,
  name: researchTitleSchema,
});

export const updateItemSchema = z.object({
  projectId: idSchema,
  itemId: idSchema,
  changes: z
    .object({
      title: researchTitleSchema,
      content: docSchema,
      url: researchUrlSchema,
      description: z.string().trim().max(MAX_DESCRIPTION_LENGTH, `Descriptions must be ${MAX_DESCRIPTION_LENGTH} characters or fewer`),
    })
    .partial()
    .strict()
    .refine((c) => Object.keys(c).length > 0, "Nothing to save"),
});

export const moveFolderSchema = z.object({
  projectId: idSchema,
  folderId: idSchema,
  parentId: idSchema.nullable(),
  index: z.number().int().min(0).max(10_000),
});

export const moveItemSchema = z.object({
  projectId: idSchema,
  itemId: idSchema,
  folderId: idSchema.nullable(),
  index: z.number().int().min(0).max(10_000),
});

export const setItemLinkSchema = z.object({
  projectId: idSchema,
  itemId: idSchema,
  link: z.object({ kind: z.enum(["character", "place", "scene"]), id: idSchema }).nullable(),
});

export const folderRefSchema = z.object({
  projectId: idSchema,
  folderId: idSchema,
});
export const itemRefSchema = z.object({
  projectId: idSchema,
  itemId: idSchema,
});
export const projectRefSchema = z.object({ projectId: idSchema });

export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type ResearchItemChanges = UpdateItemInput["changes"];
export type SetItemLinkInput = z.input<typeof setItemLinkSchema>;
