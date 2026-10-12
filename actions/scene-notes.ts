"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import { MAX_NOTES_PER_SCENE, createSceneNoteSchema, sceneNoteRefSchema, updateSceneNoteSchema } from "@/lib/scene-note-config";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Scene not found.";
const NOTE_NOT_FOUND = "Note not found.";

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/** After a write: expire the cached reads it changed and refresh the open page. The tags must match lib/scene-notes.ts. */
function refresh(projectId: string, ...tags: string[]) {
  for (const tag of tags) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function createSceneNote(input: {
  projectId: string;
  sceneId: string;
  title?: string;
  content: string;
  id?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createSceneNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, sceneId, title, content, id } = parsed.data;

    const scene = await prisma.manuscriptNode.findFirst({
      where: { id: sceneId, projectId, project: { userId: user.id }, trashedAt: null },
      select: { id: true, _count: { select: { notes: { where: { trashedAt: null } } } } },
    });
    if (!scene) return { success: false, error: NOT_FOUND };
    if (scene._count.notes >= MAX_NOTES_PER_SCENE) {
      return { success: false, error: `A scene can have up to ${MAX_NOTES_PER_SCENE} notes.` };
    }

    const created = await prisma.sceneNote.create({
      data: { ...(id && { id }), sceneId, ...(title && { title }), content },
      select: { id: true },
    });

    refresh(projectId, cacheTags.sceneNotes(sceneId));
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createSceneNote failed:", error);
    return { success: false, error: "Could not add the note. Please try again." };
  }
}

export async function updateSceneNote(input: {
  projectId: string;
  sceneId: string;
  noteId: string;
  title?: string;
  content?: string;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = updateSceneNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, sceneId, noteId, title, content } = parsed.data;

    const { count } = await prisma.sceneNote.updateMany({
      where: { id: noteId, sceneId, trashedAt: null, scene: { projectId, project: { userId: user.id }, trashedAt: null } },
      data: { ...(title !== undefined && { title: title || null }), ...(content !== undefined && { content }) },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.sceneNotes(sceneId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateSceneNote failed:", error);
    return { success: false, error: "Could not save the note. Please try again." };
  }
}

export async function trashSceneNote(input: { projectId: string; sceneId: string; noteId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = sceneNoteRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, sceneId, noteId } = parsed.data;

    const { count } = await prisma.sceneNote.updateMany({
      where: { id: noteId, sceneId, trashedAt: null, scene: { projectId, project: { userId: user.id }, trashedAt: null } },
      data: { trashedAt: new Date() },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.sceneNotes(sceneId), cacheTags.trash(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("trashSceneNote failed:", error);
    return { success: false, error: "Could not move the note to the trash. Please try again." };
  }
}
