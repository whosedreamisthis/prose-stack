import type { LineSpacing } from "@/lib/project-config";

export interface ProjectSummary {
  id: string;
  title: string;
  subtitle: string | null;
  author: string;
  coverDesign: string;
  coverColor: string;
  coverImageUrl: string | null;
  /** Raw column values; run them through `toFormatting` (lib/formatting.ts) before use. */
  fontFamily: string;
  fontSize: number;
  lineSpacing: LineSpacing;
  updatedAt: Date;
}
