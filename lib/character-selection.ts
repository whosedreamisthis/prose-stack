import type { CharacterSummary } from "@/types/characters";

/** The character a request asks for, else the first main character, else the first in the list. Pure, so client code can use it too. */
export function resolveActiveCharacter(characters: CharacterSummary[], requestedId: string | undefined | null) {
  return characters.find((c) => c.id === requestedId) ?? characters.find((c) => c.role === "MAIN") ?? characters[0] ?? null;
}
