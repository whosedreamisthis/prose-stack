import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UPLOAD_MAX_SIZE, UPLOAD_TYPES, uploadInputSchema, type UploadKind } from "@/lib/research-config";
import { authorizeUpload, createUploadedItem } from "@/lib/research-uploads";

const f = createUploadthing();

/** One file per request, of the kind's exact MIME types: UploadThing refuses anything else before the middleware runs. */
function routeConfig(kind: UploadKind) {
  return Object.fromEntries(
    Object.keys(UPLOAD_TYPES[kind]).map((mime) => [mime, { maxFileSize: UPLOAD_MAX_SIZE[kind], maxFileCount: 1 }]),
  ) as Record<`${string}/${string}`, { maxFileSize: (typeof UPLOAD_MAX_SIZE)[UploadKind]; maxFileCount: 1 }>;
}

function researchUpload(kind: UploadKind) {
  return f(routeConfig(kind))
    .input(uploadInputSchema)
    .middleware(({ input, files }) => authorizeUpload(kind, input, files))
    .onUploadComplete(async ({ metadata, file }) => createUploadedItem(kind, metadata, file));
}

export const researchFileRouter = {
  researchImage: researchUpload("IMAGE"),
  researchFile: researchUpload("FILE"),
} satisfies FileRouter;

export type ResearchFileRouter = typeof researchFileRouter;
