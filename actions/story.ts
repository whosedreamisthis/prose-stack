"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { BEAT_NOT_FOUND, beatSceneSchema, toggleBeatSchema } from "@/lib/story-config";
import { beatKeysOf } from "@/lib/story-templates";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Project not found.";

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/** After a write: expire the cached structure and refresh the open page. The tag must match lib/story.ts. */
function refresh(projectId: string) {
  updateTag(cacheTags.structure(projectId));
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Null when the project is the signed-in user's and its template has the beat; otherwise the error to return. */
async function beatError(userId: string, projectId: string, beatKey: string): Promise<string | null> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { storyTemplateId: true } });
  if (!project) return NOT_FOUND;
  return beatKeysOf(project.storyTemplateId).has(beatKey) ? null : BEAT_NOT_FOUND;
}

export async function toggleBeatCovered(input: { projectId: string; beatKey: string; covered: boolean }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = toggleBeatSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, beatKey, covered } = parsed.data;

    const error = await beatError(user.id, projectId, beatKey);
    if (error) return { success: false, error };

    await prisma.beatProgress.upsert({
      where: { projectId_beatKey: { projectId, beatKey } },
      create: { projectId, beatKey, covered },
      update: { covered },
    });

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("toggleBeatCovered failed:", error);
    return { success: false, error: "Could not save the change. Please try again." };
  }
}

export async function linkBeatScene(input: { projectId: string; beatKey: string; sceneId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = beatSceneSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, beatKey, sceneId } = parsed.data;

    const error = await beatError(user.id, projectId, beatKey);
    if (error) return { success: false, error };

    const scene = await prisma.manuscriptNode.findFirst({
      where: { id: sceneId, projectId, type: "SCENE", trashedAt: null, project: { userId: user.id } },
      select: { id: true },
    });
    if (!scene) return { success: false, error: "Scene not found." };

    await prisma.beatProgress.upsert({
      where: { projectId_beatKey: { projectId, beatKey } },
      create: { projectId, beatKey, scenes: { connect: { id: sceneId } } },
      update: { scenes: { connect: { id: sceneId } } },
    });

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("linkBeatScene failed:", error);
    return { success: false, error: "Could not link the scene. Please try again." };
  }
}

export async function unlinkBeatScene(input: { projectId: string; beatKey: string; sceneId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = beatSceneSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, beatKey, sceneId } = parsed.data;

    const error = await beatError(user.id, projectId, beatKey);
    if (error) return { success: false, error };

    // Relation writes need a unique where, so the project's ownership (checked above) stands in for a scoped updateMany.
    const row = await prisma.beatProgress.findUnique({ where: { projectId_beatKey: { projectId, beatKey } }, select: { id: true } });
    if (row) await prisma.beatProgress.update({ where: { id: row.id }, data: { scenes: { disconnect: { id: sceneId } } } });

    refresh(projectId);
    return { success: true, data: undefined };
  } catch (error) {
    console.error("unlinkBeatScene failed:", error);
    return { success: false, error: "Could not unlink the scene. Please try again." };
  }
}
