import { generateReactHelpers } from "@uploadthing/react";
import type { ResearchFileRouter } from "@/app/api/uploadthing/core";

export const { uploadFiles } = generateReactHelpers<ResearchFileRouter>();
