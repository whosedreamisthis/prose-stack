import { describe, it, expect } from "vitest";
import { resolveActiveCharacter } from "@/lib/character-selection";
import type { CharacterSummary } from "@/types/characters";

const sup: CharacterSummary = { id: "s1", name: "Sidekick", role: "SUPPORTING" };
const main: CharacterSummary = { id: "m1", name: "Hero", role: "MAIN" };

describe("resolveActiveCharacter", () => {
  it("returns the requested character", () => {
    expect(resolveActiveCharacter([main, sup], "s1")).toBe(sup);
  });

  it("falls back to the first main character, then to any character", () => {
    expect(resolveActiveCharacter([sup, main], undefined)).toBe(main);
    expect(resolveActiveCharacter([sup], "gone")).toBe(sup);
  });

  it("returns null when there are no characters", () => {
    expect(resolveActiveCharacter([], "m1")).toBeNull();
  });
});
