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

/** What an upload becomes: an IMAGE (shown in the pane) or a FILE (downloaded). */
export type UploadKind = "IMAGE" | "FILE";

/** The types each kind accepts, by MIME type, with the extension a browser may report instead of a type. */
export const UPLOAD_TYPES: Record<UploadKind, Record<string, { label: string; extensions: string[] }>> = {
  IMAGE: {
    "image/jpeg": { label: "JPEG", extensions: ["jpg", "jpeg"] },
    "image/png": { label: "PNG", extensions: ["png"] },
    "image/webp": { label: "WebP", extensions: ["webp"] },
    "image/gif": { label: "GIF", extensions: ["gif"] },
  },
  FILE: {
    "application/pdf": { label: "PDF", extensions: ["pdf"] },
    "text/plain": { label: "TXT", extensions: ["txt"] },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { label: "DOCX", extensions: ["docx"] },
  },
};
const MB = 1024 * 1024;
export const UPLOAD_MAX_BYTES: Record<UploadKind, number> = { IMAGE: 4 * MB, FILE: 8 * MB };
/** UploadThing's spelling of the same limits, for the file router. */
export const UPLOAD_MAX_SIZE = { IMAGE: "4MB", FILE: "8MB" } as const;
/** Research storage per project: the sizes of its uploads, live, archived and trashed. */
export const PROJECT_STORAGE_BYTES = 100 * MB;
export const UPLOAD_ENDPOINT = { IMAGE: "researchImage", FILE: "researchFile" } as const;

/** A file's MIME type, from its extension when the browser gives none. Lower case. */
export function uploadMimeType(file: { name: string; type: string }): string {
  if (file.type) return file.type.toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  for (const types of Object.values(UPLOAD_TYPES)) {
    for (const [mime, { extensions }] of Object.entries(types)) if (extensions.includes(ext)) return mime;
  }
  return "";
}

/** Which kind a file uploads as, or null when it is not a type research takes. */
export function uploadKindOf(file: { name: string; type: string }): UploadKind | null {
  const mime = uploadMimeType(file);
  if (mime in UPLOAD_TYPES.IMAGE) return "IMAGE";
  if (mime in UPLOAD_TYPES.FILE) return "FILE";
  return null;
}

const typeList = (kind: UploadKind) => Object.values(UPLOAD_TYPES[kind]).map((t) => t.label).join(", ");

/** Why a file can't be uploaded as `kind`, or null when it can. The file router and the picker both ask. */
export function uploadProblem(kind: UploadKind, file: { name: string; type: string; size: number }): string | null {
  if (!(uploadMimeType(file) in UPLOAD_TYPES[kind])) {
    return `${file.name} can't be uploaded: ${kind === "IMAGE" ? "images" : "files"} must be ${typeList(kind)}.`;
  }
  if (file.size > UPLOAD_MAX_BYTES[kind]) {
    return `${file.name} is too large: ${kind === "IMAGE" ? "images" : "files"} can be up to ${formatBytes(UPLOAD_MAX_BYTES[kind])}.`;
  }
  return null;
}

/** "512 KB", "3.4 MB": a size for people. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`;
  return `${Number((bytes / MB).toFixed(1))} MB`;
}

/** A file's name without its extension, as an item title. */
export function titleFromFileName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").trim() || name.trim();
  return base.slice(0, MAX_RESEARCH_TITLE_LENGTH).trim() || "Untitled";
}

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
/** What the client sends with an upload: where the new item goes. Everything about the file comes from UploadThing. */
export const uploadInputSchema = z.object({
  projectId: idSchema,
  folderId: idSchema.nullable(),
});

export type UpdateItemInput = z.input<typeof updateItemSchema>;
export type ResearchItemChanges = UpdateItemInput["changes"];
export type SetItemLinkInput = z.input<typeof setItemLinkSchema>;
