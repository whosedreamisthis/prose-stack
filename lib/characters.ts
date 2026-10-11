import { cacheLife, cacheTag } from "next/cache";
import { cacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/db";
import type { CharacterDetail, CharacterNoteItem, CharacterSummary } from "@/types/characters";

const visible = { trashedAt: null, archivedAt: null } as const;

// These reads are cached until a Server Action in actions/characters.ts changes what they return (see lib/cache-tags.ts).
// The user id is an argument, so it is part of each cache key and a user never reads another user's entry.

/** The project's characters that are not trashed or archived. Empty when the project is not the user's. */
export async function listCharacters(userId: string, projectId: string): Promise<CharacterSummary[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.characters(projectId), cacheTags.project(projectId));
  return prisma.character.findMany({
    where: { projectId, project: { userId }, ...visible },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true },
  });
}

export async function getCharacter(userId: string, projectId: string, characterId: string): Promise<CharacterDetail | null> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.character(characterId), cacheTags.project(projectId));
  const row = await prisma.character.findFirst({
    where: { id: characterId, projectId, project: { userId }, ...visible },
    select: {
      id: true,
      name: true,
      role: true,
      age: true,
      location: true,
      roleInStory: true,
      goal: true,
      physicalDescription: true,
      personality: true,
      occupation: true,
      habits: true,
      background: true,
      internalConflicts: true,
      externalConflicts: true,
    },
  });
  if (!row) return null;
  const text = (v: string | null) => v ?? "";
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    age: text(row.age),
    location: text(row.location),
    roleInStory: text(row.roleInStory),
    goal: text(row.goal),
    physicalDescription: text(row.physicalDescription),
    personality: text(row.personality),
    occupation: text(row.occupation),
    habits: text(row.habits),
    background: text(row.background),
    internalConflicts: text(row.internalConflicts),
    externalConflicts: text(row.externalConflicts),
  };
}

/** Notes of one character, oldest first. */
export async function listCharacterNotes(userId: string, projectId: string, characterId: string): Promise<CharacterNoteItem[]> {
  "use cache";
  cacheLife("days");
  cacheTag(cacheTags.characterNotes(characterId), cacheTags.project(projectId));
  return prisma.characterNote.findMany({
    where: { characterId, character: { projectId, project: { userId }, ...visible } },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true },
  });
}
