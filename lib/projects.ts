import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
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

/**
 * The user's projects, most recently edited first. Cached until a project is created, edited or deleted, or a scene is
 * saved (which moves the project up and changes its "Edited" date).
 */
export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.projects(userId));
  return prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: summarySelect,
  });
}

/**
 * Null when the project does not exist or belongs to someone else. Cached until updateProject or deleteProject drops it,
 * so `updatedAt` can lag behind saves; only the project list shows it, and that reads listProjects, which is not cached.
 */
export async function getProject(userId: string, projectId: string): Promise<ProjectSummary | null> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.project(projectId));
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
