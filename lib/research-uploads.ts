import "server-only";
import { UploadThingError } from "uploadthing/server";
import type { Prisma } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  MAX_RESEARCH_ITEMS,
  PROJECT_STORAGE_BYTES,
  formatBytes,
  titleFromFileName,
  uploadMimeType,
  uploadProblem,
  type UploadKind,
} from "@/lib/research-config";

const live = { trashedAt: null, archivedAt: null } as const;

/** Where an upload goes, as checked by the middleware and handed to `onUploadComplete`. */
// A type, not an interface: UploadThing wants metadata it can index by string.
export type UploadMetadata = {
  userId: string;
  projectId: string;
  folderId: string | null;
};

/** The research storage a project uses: the sizes of all its uploads, live, archived and trashed. */
export async function storageUsed(projectId: string): Promise<number> {
  const { _sum } = await prisma.researchItem.aggregate({ where: { projectId }, _sum: { fileSize: true } });
  return _sum.fileSize ?? 0;
}

/**
 * The file router's middleware: runs before any bytes are stored. Refuses (with an `UploadThingError`, whose message
 * reaches the client) a signed-out caller, a project that is not theirs, a missing folder, a file of the wrong type or
 * size, a full library, and an upload past the project's storage.
 */
export async function authorizeUpload(
  kind: UploadKind,
  input: { projectId: string; folderId: string | null },
  files: readonly { name: string; size: number; type: string }[],
): Promise<UploadMetadata> {
  const user = await getCurrentUser();
  if (!user) throw new UploadThingError("You need to be signed in.");
  const { projectId, folderId } = input;

  const project = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
  if (!project) throw new UploadThingError("Project not found.");
  if (folderId !== null) {
    const folder = await prisma.researchFolder.findFirst({ where: { id: folderId, projectId, ...live }, select: { id: true } });
    if (!folder) throw new UploadThingError("Folder not found.");
  }

  for (const file of files) {
    const problem = uploadProblem(kind, file);
    if (problem) throw new UploadThingError(problem);
  }
  if ((await prisma.researchItem.count({ where: { projectId, ...live } })) + files.length > MAX_RESEARCH_ITEMS) {
    throw new UploadThingError(`A project can have up to ${MAX_RESEARCH_ITEMS} research items.`);
  }
  const incoming = files.reduce((sum, f) => sum + f.size, 0);
  const used = await storageUsed(projectId);
  if (used + incoming > PROJECT_STORAGE_BYTES) {
    throw new UploadThingError(
      `Research storage is full: this project uses ${formatBytes(used)} of ${formatBytes(PROJECT_STORAGE_BYTES)}. Delete uploads from the trash to make room.`,
    );
  }
  return { userId: user.id, projectId, folderId };
}

/**
 * Adds the uploaded file to the library, at the end of its folder; the top level if the folder was hidden while the file
 * uploaded. Runs in `onUploadComplete`, so the address is UploadThing's and never the client's.
 */
export async function createUploadedItem(
  kind: UploadKind,
  meta: UploadMetadata,
  file: { key: string; name: string; size: number; type: string; ufsUrl: string },
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "Project" WHERE "id" = ${meta.projectId} AND "userId" = ${meta.userId} FOR UPDATE`;
    if (rows.length === 0) throw new UploadThingError("Project not found.");
    const folder = meta.folderId
      ? await tx.researchFolder.findFirst({ where: { id: meta.folderId, projectId: meta.projectId, ...live }, select: { id: true } })
      : null;
    const folderId = folder?.id ?? null;
    const position = await tx.researchItem.count({ where: { projectId: meta.projectId, folderId, ...live } });
    return tx.researchItem.create({
      data: {
        projectId: meta.projectId,
        folderId,
        type: kind,
        title: titleFromFileName(file.name),
        url: file.ufsUrl,
        fileKey: file.key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: uploadMimeType(file),
        position,
      },
      select: { id: true },
    });
  });
}
