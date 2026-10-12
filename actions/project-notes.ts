"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import {
  MAX_NOTES_PER_PROJECT,
  createProjectNoteSchema,
  projectNoteRefSchema,
  updateProjectNoteSchema,
} from "@/lib/project-note-config";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Project not found.";
const NOTE_NOT_FOUND = "Note not found.";

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/** After a write: expire the cached reads it changed and refresh the open page. The tags must match lib/project-notes.ts. */
function refresh(projectId: string, ...tags: string[]) {
  for (const tag of tags) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

export async function createProjectNote(input: {
  projectId: string;
  title?: string;
  content: string;
  id?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createProjectNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, title, content, id } = parsed.data;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true, _count: { select: { notes: { where: { trashedAt: null } } } } },
    });
    if (!project) return { success: false, error: NOT_FOUND };
    if (project._count.notes >= MAX_NOTES_PER_PROJECT) {
      return { success: false, error: `A manuscript can have up to ${MAX_NOTES_PER_PROJECT} notes.` };
    }

    const created = await prisma.projectNote.create({
      data: { ...(id && { id }), projectId, ...(title && { title }), content },
      select: { id: true },
    });

    refresh(projectId, cacheTags.projectNotes(projectId));
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createProjectNote failed:", error);
    return { success: false, error: "Could not add the note. Please try again." };
  }
}

export async function updateProjectNote(input: {
  projectId: string;
  noteId: string;
  title?: string;
  content?: string;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = updateProjectNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, noteId, title, content } = parsed.data;

    const { count } = await prisma.projectNote.updateMany({
      where: { id: noteId, projectId, trashedAt: null, project: { userId: user.id } },
      data: { ...(title !== undefined && { title: title || null }), ...(content !== undefined && { content }) },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.projectNotes(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateProjectNote failed:", error);
    return { success: false, error: "Could not save the note. Please try again." };
  }
}

export async function trashProjectNote(input: { projectId: string; noteId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = projectNoteRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, noteId } = parsed.data;

    const { count } = await prisma.projectNote.updateMany({
      where: { id: noteId, projectId, trashedAt: null, project: { userId: user.id } },
      data: { trashedAt: new Date() },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.projectNotes(projectId), cacheTags.trash(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("trashProjectNote failed:", error);
    return { success: false, error: "Could not move the note to the trash. Please try again." };
  }
}
