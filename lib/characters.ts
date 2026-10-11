import { cache } from "react";
import { prisma } from "@/lib/db";
import type { CharacterDetail, CharacterNoteItem, CharacterSummary } from "@/types/characters";

const visible = { trashedAt: null, archivedAt: null } as const;

/** The project's characters that are not trashed or archived. Empty when the project is not the user's. Memoized per request. */
export const listCharacters = cache(async (userId: string, projectId: string): Promise<CharacterSummary[]> =>
  prisma.character.findMany({
    where: { projectId, project: { userId }, ...visible },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, role: true },
  }),
);

/** Memoized per request, so a page that asks for the same character twice reads it once. */
export const getCharacter = cache(async (userId: string, projectId: string, characterId: string): Promise<CharacterDetail | null> => {
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
});

/** Notes of one character, oldest first. */
export async function listCharacterNotes(userId: string, projectId: string, characterId: string): Promise<CharacterNoteItem[]> {
  return prisma.characterNote.findMany({
    where: { characterId, character: { projectId, project: { userId }, ...visible } },
    orderBy: { createdAt: "asc" },
    select: { id: true, content: true },
  });
}
