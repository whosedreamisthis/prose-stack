"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import {
  DEFAULT_PLACE_NAME,
  MAX_NOTES_PER_PLACE,
  createNoteSchema,
  createPlaceSchema,
  noteRefSchema,
  placeRefSchema,
  setPlaceCharactersSchema,
  updateNoteSchema,
  updatePlaceSchema,
  type CreatePlaceInput,
  type UpdatePlaceInput,
} from "@/lib/place-config";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Place not found.";

function invalid(error: { issues: { message: string }[] }): {
  success: false;
  error: string;
} {
  return {
    success: false,
    error: error.issues[0]?.message ?? "Invalid request.",
  };
}

/**
 * After a write: expire the cached reads it changed (so the next read is fresh, never stale), and refresh the open page.
 * The tags must match the ones lib/places.ts reads under.
 */
function refresh(projectId: string, ...tags: string[]) {
  for (const tag of tags) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Fields are stored as null when blank, so an emptied field and a never-filled one look the same. */
function blankToNull(changes: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, key === "name" ? value : value?.trim() || null]));
}

export async function createPlace(input: CreatePlaceInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createPlaceSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, id } = parsed.data;

    const owned = await prisma.project.findFirst({
      where: { id: projectId, userId: user.id },
      select: { id: true },
    });
    if (!owned) return { success: false, error: "Project not found." };

    const created = await prisma.place.create({
      data: { ...(id && { id }), projectId, name: DEFAULT_PLACE_NAME },
      select: { id: true },
    });

    refresh(projectId, cacheTags.places(projectId));
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createPlace failed:", error);
    return {
      success: false,
      error: "Could not add the place. Please try again.",
    };
  }
}

export async function updatePlace(input: UpdatePlaceInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = updatePlaceSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, placeId, changes } = parsed.data;

    const { count } = await prisma.place.updateMany({
      where: {
        id: placeId,
        projectId,
        project: { userId: user.id },
        trashedAt: null,
        archivedAt: null,
      },
      data: blankToNull(changes),
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    // The list shows the name, so only a rename needs it expired.
    refresh(projectId, cacheTags.place(placeId), ...(changes.name !== undefined ? [cacheTags.places(projectId)] : []));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updatePlace failed:", error);
    return {
      success: false,
      error: "Could not save the place. Please try again.",
    };
  }
}

/** Replaces the place's related characters with exactly these. Ids that are not the project's live characters are rejected. */
export async function setPlaceCharacters(input: { projectId: string; placeId: string; characterIds: string[] }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = setPlaceCharactersSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, placeId } = parsed.data;
    const characterIds = [...new Set(parsed.data.characterIds)];

    const place = await prisma.place.findFirst({
      where: {
        id: placeId,
        projectId,
        project: { userId: user.id },
        trashedAt: null,
        archivedAt: null,
      },
      select: { id: true },
    });
    if (!place) return { success: false, error: NOT_FOUND };

    const valid = await prisma.character.count({
      where: {
        id: { in: characterIds },
        projectId,
        trashedAt: null,
        archivedAt: null,
      },
    });
    if (valid !== characterIds.length) return { success: false, error: "Character not found." };

    await prisma.place.update({
      where: { id: placeId },
      data: { relatedCharacters: { set: characterIds.map((id) => ({ id })) } },
      select: { id: true },
    });

    refresh(projectId, cacheTags.place(placeId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("setPlaceCharacters failed:", error);
    return {
      success: false,
      error: "Could not save the related characters. Please try again.",
    };
  }
}

async function setHidden(
  input: { projectId: string; placeId: string },
  field: "trashedAt" | "archivedAt",
  failure: string,
): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = placeRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, placeId } = parsed.data;

    const { count } = await prisma.place.updateMany({
      where: {
        id: placeId,
        projectId,
        project: { userId: user.id },
        trashedAt: null,
        archivedAt: null,
      },
      data: { [field]: new Date() },
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    refresh(
      projectId,
      cacheTags.places(projectId),
      cacheTags.place(placeId),
      cacheTags.placeNotes(placeId),
      field === "trashedAt" ? cacheTags.trash(projectId) : cacheTags.archive(projectId),
    );
    return { success: true, data: undefined };
  } catch (error) {
    console.error(`${field} update failed:`, error);
    return { success: false, error: failure };
  }
}

export async function trashPlace(input: { projectId: string; placeId: string }) {
  return setHidden(input, "trashedAt", "Could not move the place to the trash. Please try again.");
}

export async function archivePlace(input: { projectId: string; placeId: string }) {
  return setHidden(input, "archivedAt", "Could not archive the place. Please try again.");
}

const NOTE_NOT_FOUND = "Note not found.";

export async function createPlaceNote(input: {
  projectId: string;
  placeId: string;
  title?: string;
  content: string;
  id?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, placeId, title, content, id } = parsed.data;

    const place = await prisma.place.findFirst({
      where: {
        id: placeId,
        projectId,
        project: { userId: user.id },
        trashedAt: null,
        archivedAt: null,
      },
      select: { id: true, _count: { select: { notes: { where: { trashedAt: null } } } } },
    });
    if (!place) return { success: false, error: NOT_FOUND };
    if (place._count.notes >= MAX_NOTES_PER_PLACE) {
      return {
        success: false,
        error: `A place can have up to ${MAX_NOTES_PER_PLACE} notes.`,
      };
    }

    const created = await prisma.placeNote.create({
      data: { ...(id && { id }), placeId, ...(title && { title }), content },
      select: { id: true },
    });

    refresh(projectId, cacheTags.placeNotes(placeId));
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createPlaceNote failed:", error);
    return {
      success: false,
      error: "Could not add the note. Please try again.",
    };
  }
}

export async function updatePlaceNote(input: {
  projectId: string;
  placeId: string;
  noteId: string;
  title?: string;
  content?: string;
}): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = updateNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, placeId, noteId, title, content } = parsed.data;

    const { count } = await prisma.placeNote.updateMany({
      where: {
        id: noteId,
        placeId,
        trashedAt: null,
        place: { projectId, project: { userId: user.id } },
      },
      data: { ...(title !== undefined && { title: title || null }), ...(content !== undefined && { content }) },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.placeNotes(placeId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updatePlaceNote failed:", error);
    return {
      success: false,
      error: "Could not save the note. Please try again.",
    };
  }
}

export async function trashPlaceNote(input: { projectId: string; placeId: string; noteId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = noteRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, placeId, noteId } = parsed.data;

    const { count } = await prisma.placeNote.updateMany({
      where: {
        id: noteId,
        placeId,
        trashedAt: null,
        place: { projectId, project: { userId: user.id } },
      },
      data: { trashedAt: new Date() },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.placeNotes(placeId), cacheTags.trash(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("trashPlaceNote failed:", error);
    return {
      success: false,
      error: "Could not move the note to the trash. Please try again.",
    };
  }
}
