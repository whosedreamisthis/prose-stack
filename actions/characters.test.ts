import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import {
  archiveCharacter,
  createCharacter,
  createCharacterNote,
  trashCharacterNote,
  trashCharacter,
  updateCharacter,
  updateCharacterNote,
} from "@/actions/characters";
import { MAX_NOTES_PER_CHARACTER } from "@/lib/character-config";

const owned = { project: { userId: "user-1" } };

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createCharacter", () => {
  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await createCharacter({ projectId: "p1", role: "MAIN" })).success).toBe(false);
    expect(prismaMock.character.create).not.toHaveBeenCalled();
  });

  it("rejects a project that is not the user's", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    const result = await createCharacter({ projectId: "p1", role: "MAIN" });
    expect(result.success).toBe(false);
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "user-1" } }));
    expect(prismaMock.character.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown role", async () => {
    const result = await createCharacter({ projectId: "p1", role: "VILLAIN" as "MAIN" });
    expect(result.success).toBe(false);
  });

  it("creates a named character in the chosen group, under the client's id", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "p1" });
    prismaMock.character.create.mockResolvedValue({ id: "client-id-1" });

    const result = await createCharacter({ projectId: "p1", role: "SUPPORTING", id: "client-id-1" });

    expect(result).toEqual({ success: true, data: { id: "client-id-1" } });
    expect(prismaMock.character.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: "client-id-1", projectId: "p1", role: "SUPPORTING", name: "New character" } }),
    );
  });
});

describe("updateCharacter", () => {
  it("scopes the update to the user's project and live characters", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    await updateCharacter({ projectId: "p1", characterId: "c1", changes: { goal: "Find the key" } });
    expect(prismaMock.character.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", projectId: "p1", ...owned, trashedAt: null, archivedAt: null },
      data: { goal: "Find the key" },
    });
  });

  it("stores a blank sketch field as null but keeps the name trimmed", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    await updateCharacter({ projectId: "p1", characterId: "c1", changes: { name: "  Ada  ", age: "   " } });
    expect(prismaMock.character.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "Ada", age: null } }));
  });

  it("rejects a blank name, an unknown field and an empty change", async () => {
    expect((await updateCharacter({ projectId: "p1", characterId: "c1", changes: { name: "   " } })).success).toBe(false);
    expect((await updateCharacter({ projectId: "p1", characterId: "c1", changes: { userId: "x" } as never })).success).toBe(false);
    expect((await updateCharacter({ projectId: "p1", characterId: "c1", changes: {} })).success).toBe(false);
    expect(prismaMock.character.updateMany).not.toHaveBeenCalled();
  });

  it("reports a character that is not found", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 0 });
    expect((await updateCharacter({ projectId: "p1", characterId: "c1", changes: { goal: "x" } })).success).toBe(false);
  });
});

describe.each([
  ["trashCharacter", trashCharacter, "trashedAt"],
  ["archiveCharacter", archiveCharacter, "archivedAt"],
] as const)("%s", (_name, action, field) => {
  it(`stamps ${field} on a live character the user owns`, async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    const result = await action({ projectId: "p1", characterId: "c1" });
    expect(result.success).toBe(true);
    expect(prismaMock.character.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", projectId: "p1", ...owned, trashedAt: null, archivedAt: null },
      data: { [field]: expect.any(Date) },
    });
  });

  it("fails when nothing matched", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 0 });
    expect((await action({ projectId: "p1", characterId: "c1" })).success).toBe(false);
  });

  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await action({ projectId: "p1", characterId: "c1" })).success).toBe(false);
    expect(prismaMock.character.updateMany).not.toHaveBeenCalled();
  });
});

describe("character notes", () => {
  it("adds a trimmed note to a character the user owns", async () => {
    prismaMock.character.findFirst.mockResolvedValue({ id: "c1", _count: { notes: 2 } });
    prismaMock.characterNote.create.mockResolvedValue({ id: "n1" });

    const result = await createCharacterNote({ projectId: "p1", characterId: "c1", content: "  Afraid of water  " });

    expect(result).toEqual({ success: true, data: { id: "n1" } });
    expect(prismaMock.character.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1", projectId: "p1", ...owned, trashedAt: null, archivedAt: null } }),
    );
    expect(prismaMock.characterNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { characterId: "c1", content: "Afraid of water" } }),
    );
  });

  it("stores a note's title, and allows a title with no text but not neither", async () => {
    prismaMock.character.findFirst.mockResolvedValue({ id: "c1", _count: { notes: 0 } });
    prismaMock.characterNote.create.mockResolvedValue({ id: "n1" });

    expect((await createCharacterNote({ projectId: "p1", characterId: "c1", title: "  Fear  ", content: "" })).success).toBe(true);
    expect(prismaMock.characterNote.create).toHaveBeenCalledWith(expect.objectContaining({ data: { characterId: "c1", title: "Fear", content: "" } }));

    prismaMock.characterNote.create.mockClear();
    expect((await createCharacterNote({ projectId: "p1", characterId: "c1", title: "  ", content: "" })).success).toBe(false);
    expect(prismaMock.characterNote.create).not.toHaveBeenCalled();
  });

  it("updates a title and clears it with a blank one", async () => {
    prismaMock.characterNote.updateMany.mockResolvedValue({ count: 1 });
    await updateCharacterNote({ projectId: "p1", characterId: "c1", noteId: "n1", title: "Fear", content: "Water" });
    expect(prismaMock.characterNote.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { title: "Fear", content: "Water" } }));
    await updateCharacterNote({ projectId: "p1", characterId: "c1", noteId: "n1", title: " ", content: "Water" });
    expect(prismaMock.characterNote.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { title: null, content: "Water" } }));
  });

  it("rejects an empty note and a character that is not found", async () => {
    expect((await createCharacterNote({ projectId: "p1", characterId: "c1", content: "  " })).success).toBe(false);
    prismaMock.character.findFirst.mockResolvedValue(null);
    expect((await createCharacterNote({ projectId: "p1", characterId: "c1", content: "ok" })).success).toBe(false);
    expect(prismaMock.characterNote.create).not.toHaveBeenCalled();
  });

  it("stops at the per-character note limit", async () => {
    prismaMock.character.findFirst.mockResolvedValue({ id: "c1", _count: { notes: MAX_NOTES_PER_CHARACTER } });
    expect((await createCharacterNote({ projectId: "p1", characterId: "c1", content: "one more" })).success).toBe(false);
    expect(prismaMock.characterNote.create).not.toHaveBeenCalled();
  });

  it("updates and trashes only live notes reached through the user's own project", async () => {
    prismaMock.characterNote.updateMany.mockResolvedValue({ count: 1 });
    expect((await updateCharacterNote({ projectId: "p1", characterId: "c1", noteId: "n1", content: "New text" })).success).toBe(true);
    expect((await trashCharacterNote({ projectId: "p1", characterId: "c1", noteId: "n1" })).success).toBe(true);

    const scope = { characterId: "c1", trashedAt: null, character: { projectId: "p1", ...owned } };
    expect(prismaMock.characterNote.updateMany).toHaveBeenCalledWith({ where: { id: "n1", ...scope }, data: { content: "New text" } });
    expect(prismaMock.characterNote.updateMany).toHaveBeenLastCalledWith({ where: { id: "n1", ...scope }, data: { trashedAt: expect.any(Date) } });
  });

  it("reports a note that is not found", async () => {
    prismaMock.characterNote.updateMany.mockResolvedValue({ count: 0 });
    expect((await updateCharacterNote({ projectId: "p1", characterId: "c1", noteId: "n1", content: "x" })).success).toBe(false);
    expect((await trashCharacterNote({ projectId: "p1", characterId: "c1", noteId: "n1" })).success).toBe(false);
  });
});

describe("cache invalidation", () => {
  it("expires the list and the sketch when a character is edited", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    await updateCharacter({ projectId: "p1", characterId: "c1", changes: { goal: "x" } });
    expect(updateTag).toHaveBeenCalledWith("character:c1");
    expect(updateTag).toHaveBeenCalledWith("characters:p1");
    expect(updateTag).not.toHaveBeenCalledWith("character-notes:c1");
  });

  it("expires only that character's notes when a note changes", async () => {
    prismaMock.characterNote.updateMany.mockResolvedValue({ count: 1 });
    await updateCharacterNote({ projectId: "p1", characterId: "c1", noteId: "n1", content: "x" });
    expect(updateTag).toHaveBeenCalledTimes(1);
    expect(updateTag).toHaveBeenCalledWith("character-notes:c1");
  });

  it("expires everything about a character that is trashed", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    await trashCharacter({ projectId: "p1", characterId: "c1" });
    expect(vi.mocked(updateTag).mock.calls.map(([tag]) => tag).sort()).toEqual(["character-notes:c1", "character:c1", "characters:p1", "trash:p1"]);
  });

  it("expires the Archive page when a character is archived", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    await archiveCharacter({ projectId: "p1", characterId: "c1" });
    expect(updateTag).toHaveBeenCalledWith("archive:p1");
    expect(updateTag).not.toHaveBeenCalledWith("trash:p1");
  });

  it("expires nothing when the write found no row", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 0 });
    await updateCharacter({ projectId: "p1", characterId: "c1", changes: { goal: "x" } });
    expect(updateTag).not.toHaveBeenCalled();
  });
});
