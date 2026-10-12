import { z } from "zod";

/** `book` is the whole manuscript, with the project id as its id. */
export const EXPORT_TYPES = ["character", "place", "node", "book"] as const;
export type ExportType = (typeof EXPORT_TYPES)[number];

const idSchema = z.string().min(1).max(64);

export const exportParamsSchema = z.object({
  type: z.enum(EXPORT_TYPES),
  id: idSchema,
  projectId: idSchema,
});

export const EXPORT_FAILED = "Couldn't export that. Try again.";

const MAX_FILE_NAME_LENGTH = 100;

/** `<name>.pdf`, with characters that are invalid in file names removed. An empty result falls back to "Export". */
export function pdfFileName(name: string) {
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH)
    .replace(/[. ]+$/, "");
  return `${cleaned || "Export"}.pdf`;
}

/** A Content-Disposition value with a plain-ASCII fallback and the real name in `filename*`. */
export function attachmentHeader(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export function exportUrl(type: ExportType, id: string, projectId: string) {
  return `/api/export/${type}/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`;
}
