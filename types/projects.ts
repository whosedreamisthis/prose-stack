export interface ProjectSummary {
  id: string;
  title: string;
  subtitle: string | null;
  author: string;
  coverDesign: string;
  coverColor: string;
  coverImageUrl: string | null;
  updatedAt: Date;
}
