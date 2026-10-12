import "server-only";
import { UTApi } from "uploadthing/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** The stored-file keys of the research items a filter matches. */
export async function researchFileKeys(where: Prisma.ResearchItemWhereInput): Promise<string[]> {
  const rows = await prisma.researchItem.findMany({ where: { ...where, fileKey: { not: null } }, select: { fileKey: true } });
  return rows.flatMap((r) => (r.fileKey ? [r.fileKey] : []));
}

/**
 * Deletes stored files from UploadThing. A failure is logged and swallowed: the rows are deleted either way, and an
 * orphaned file is better than an item that can't be deleted.
 */
export async function deleteStoredFiles(keys: (string | null | undefined)[]): Promise<void> {
  const fileKeys = keys.filter((k): k is string => !!k);
  if (fileKeys.length === 0) return;
  try {
    await new UTApi().deleteFiles(fileKeys);
  } catch (error) {
    console.error(`Could not delete ${fileKeys.length} stored research file(s):`, fileKeys, error);
  }
}
