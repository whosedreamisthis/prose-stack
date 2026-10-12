"use server";

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { cacheTags } from "@/lib/cache-tags";
import { getCurrentUser } from "@/lib/auth";
import { seedManuscript } from "@/lib/manuscript";
import { deleteStoredFiles, researchFileKeys } from "@/lib/research-storage";
import {
  MAX_PROJECTS_PER_USER,
  PROJECT_LIMIT_MESSAGE,
  createProjectSchema,
  projectIdSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from "@/lib/project-config";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Project not found.";

export async function createProject(input: CreateProjectInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };

    const parsed = createProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid project details." };
    }
    const { title, subtitle, author, coverDesign, coverColor } = parsed.data;

    const project = await prisma.$transaction(async (tx) => {
      // Lock the user row so concurrent creates for one user run one at a time and cannot pass the limit together.
      await tx.$queryRaw`SELECT 1 FROM "User" WHERE "id" = ${user.id} FOR UPDATE`;
      const count = await tx.project.count({ where: { userId: user.id } });
      if (count >= MAX_PROJECTS_PER_USER) return null;
      const created = await tx.project.create({
        data: { userId: user.id, title, subtitle: subtitle || null, author, coverDesign, coverColor },
        select: { id: true },
      });
      await seedManuscript(tx, created.id);
      return created;
    });
    if (!project) return { success: false, error: PROJECT_LIMIT_MESSAGE };

    updateTag(cacheTags.projects(user.id));
    revalidatePath("/", "layout");
    return { success: true, data: { id: project.id } };
  } catch (error) {
    console.error("createProject failed:", error);
    return { success: false, error: "Could not create the project. Please try again." };
  }
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };

    if (!projectIdSchema.safeParse(projectId).success) return { success: false, error: NOT_FOUND };

    const parsed = updateProjectSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid project details." };
    }
    const { title, subtitle, author } = parsed.data;

    const { count } = await prisma.project.updateMany({
      where: { id: projectId, userId: user.id },
      data: { title, subtitle: subtitle || null, author },
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    // Every cached read of the project carries this tag, so this drops its characters, outline and scenes too.
    updateTag(cacheTags.project(projectId));
    updateTag(cacheTags.projects(user.id));
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateProject failed:", error);
    return { success: false, error: "Could not save the changes. Please try again." };
  }
}

export async function deleteProject(projectId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };

    if (!projectIdSchema.safeParse(projectId).success) return { success: false, error: NOT_FOUND };

    const fileKeys = await researchFileKeys({ projectId, project: { userId: user.id } });
    const { count } = await prisma.project.deleteMany({ where: { id: projectId, userId: user.id } });
    if (count === 0) return { success: false, error: NOT_FOUND };
    await deleteStoredFiles(fileKeys);

    updateTag(cacheTags.project(projectId));
    updateTag(cacheTags.projects(user.id));
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteProject failed:", error);
    return { success: false, error: "Could not delete the project. Please try again." };
  }
}

/**
 * Records that the user opened a project, so sign-in can land on it.
 * Raw SQL on purpose: a Prisma update would also bump `updatedAt`, which means "last edited".
 */
export async function markProjectOpened(projectId: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user || !projectIdSchema.safeParse(projectId).success) return;
    await prisma.$executeRaw`UPDATE "Project" SET "lastOpenedAt" = now() WHERE "id" = ${projectId} AND "userId" = ${user.id}`;
  } catch (error) {
    console.error("markProjectOpened failed:", error);
  }
}
