"use server";

import { revalidatePath, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { cacheTags } from "@/lib/cache-tags";
import {
  DEFAULT_CHARACTER_NAME,
  MAX_NOTES_PER_CHARACTER,
  characterRefSchema,
  createCharacterSchema,
  createNoteSchema,
  deleteNoteSchema,
  updateCharacterSchema,
  updateNoteSchema,
  type CreateCharacterInput,
  type UpdateCharacterInput,
} from "@/lib/character-config";
import { prisma } from "@/lib/db";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";
const NOT_FOUND = "Character not found.";
const NOTE_NOT_FOUND = "Note not found.";

function invalid(error: { issues: { message: string }[] }): { success: false; error: string } {
  return { success: false, error: error.issues[0]?.message ?? "Invalid request." };
}

/**
 * After a write: expire the cached reads it changed (so the next read is fresh, never stale), and refresh the open page.
 * The tags must match the ones lib/characters.ts reads under.
 */
function refresh(projectId: string, ...tags: string[]) {
  for (const tag of tags) updateTag(tag);
  revalidatePath(`/projects/${projectId}`, "layout");
}

/** Sketch fields are stored as null when blank, so an emptied field and a never-filled one look the same. */
function blankToNull(changes: Record<string, string | undefined>) {
  return Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, key === "name" || key === "role" ? value : value?.trim() || null]));
}

export async function createCharacter(input: CreateCharacterInput): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createCharacterSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, role, id } = parsed.data;

    const owned = await prisma.project.findFirst({ where: { id: projectId, userId: user.id }, select: { id: true } });
    if (!owned) return { success: false, error: "Project not found." };

    const created = await prisma.character.create({
      data: { ...(id && { id }), projectId, role, name: DEFAULT_CHARACTER_NAME },
      select: { id: true },
    });

    refresh(projectId, cacheTags.characters(projectId));
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createCharacter failed:", error);
    return { success: false, error: "Could not add the character. Please try again." };
  }
}

export async function updateCharacter(input: UpdateCharacterInput): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = updateCharacterSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, characterId, changes } = parsed.data;

    const { count } = await prisma.character.updateMany({
      where: { id: characterId, projectId, project: { userId: user.id }, trashedAt: null, archivedAt: null },
      data: blankToNull(changes),
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    refresh(projectId, cacheTags.character(characterId), cacheTags.characters(projectId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateCharacter failed:", error);
    return { success: false, error: "Could not save the character. Please try again." };
  }
}

async function setHidden(input: { projectId: string; characterId: string }, field: "trashedAt" | "archivedAt", failure: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = characterRefSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, characterId } = parsed.data;

    const { count } = await prisma.character.updateMany({
      where: { id: characterId, projectId, project: { userId: user.id }, trashedAt: null, archivedAt: null },
      data: { [field]: new Date() },
    });
    if (count === 0) return { success: false, error: NOT_FOUND };

    refresh(projectId, cacheTags.characters(projectId), cacheTags.character(characterId), cacheTags.characterNotes(characterId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error(`${field} update failed:`, error);
    return { success: false, error: failure };
  }
}

export async function trashCharacter(input: { projectId: string; characterId: string }) {
  return setHidden(input, "trashedAt", "Could not move the character to the trash. Please try again.");
}

export async function archiveCharacter(input: { projectId: string; characterId: string }) {
  return setHidden(input, "archivedAt", "Could not archive the character. Please try again.");
}

export async function createCharacterNote(input: {
  projectId: string;
  characterId: string;
  content: string;
  id?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = createNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, characterId, content, id } = parsed.data;

    const character = await prisma.character.findFirst({
      where: { id: characterId, projectId, project: { userId: user.id }, trashedAt: null, archivedAt: null },
      select: { id: true, _count: { select: { notes: true } } },
    });
    if (!character) return { success: false, error: NOT_FOUND };
    if (character._count.notes >= MAX_NOTES_PER_CHARACTER) {
      return { success: false, error: `A character can have up to ${MAX_NOTES_PER_CHARACTER} notes.` };
    }

    const created = await prisma.characterNote.create({
      data: { ...(id && { id }), characterId, content },
      select: { id: true },
    });

    refresh(projectId, cacheTags.characterNotes(characterId));
    return { success: true, data: { id: created.id } };
  } catch (error) {
    console.error("createCharacterNote failed:", error);
    return { success: false, error: "Could not add the note. Please try again." };
  }
}

export async function updateCharacterNote(input: { projectId: string; characterId: string; noteId: string; content: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = updateNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, characterId, noteId, content } = parsed.data;

    const { count } = await prisma.characterNote.updateMany({
      where: { id: noteId, characterId, character: { projectId, project: { userId: user.id } } },
      data: { content },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.characterNotes(characterId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("updateCharacterNote failed:", error);
    return { success: false, error: "Could not save the note. Please try again." };
  }
}

export async function deleteCharacterNote(input: { projectId: string; characterId: string; noteId: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };
    const parsed = deleteNoteSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const { projectId, characterId, noteId } = parsed.data;

    const { count } = await prisma.characterNote.deleteMany({
      where: { id: noteId, characterId, character: { projectId, project: { userId: user.id } } },
    });
    if (count === 0) return { success: false, error: NOTE_NOT_FOUND };

    refresh(projectId, cacheTags.characterNotes(characterId));
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteCharacterNote failed:", error);
    return { success: false, error: "Could not delete the note. Please try again." };
  }
}
