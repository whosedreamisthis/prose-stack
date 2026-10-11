import { prisma } from "@/lib/db";
import type { ProjectSummary } from "@/types/projects";

const summarySelect = {
  id: true,
  title: true,
  subtitle: true,
  author: true,
  coverDesign: true,
  coverColor: true,
  coverImageUrl: true,
  updatedAt: true,
} as const;

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: summarySelect,
  });
}

/** Null when the project does not exist or belongs to someone else. */
export async function getProject(userId: string, projectId: string): Promise<ProjectSummary | null> {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    select: summarySelect,
  });
}

/** Where a signed-in user lands: their last-opened project, else the project list. */
export async function getLandingPath(userId: string) {
  const last = await prisma.project.findFirst({
    where: { userId, lastOpenedAt: { not: null } },
    orderBy: { lastOpenedAt: "desc" },
    select: { id: true },
  });
  return last ? `/projects/${last.id}/manuscript` : "/projects";
}
