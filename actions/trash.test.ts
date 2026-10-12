import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { deleteItemPermanently, restoreItem, trashArchivedItem, unarchiveItem } from "@/actions/trash";

const owner = { projectId: "p1", project: { userId: "user-1" } };
const T0 = new Date("2026-01-01T10:00:00Z");
const T1 = new Date("2026-01-02T10:00:00Z");

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
  prismaMock.$queryRaw.mockResolvedValue([{ id: "p1" }]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("restoreItem", () => {
  it("rejects signed-out callers and an unknown kind", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await restoreItem({ projectId: "p1", kind: "character", id: "c1" })).success).toBe(false);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    expect((await restoreItem({ projectId: "p1", kind: "project" as "node", id: "c1" })).success).toBe(false);
    expect(prismaMock.character.updateMany).not.toHaveBeenCalled();
  });

  it("restores only a trashed character of the user's own project, and expires the lists", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    expect((await restoreItem({ projectId: "p1", kind: "character", id: "c1" })).success).toBe(true);
    expect(prismaMock.character.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", ...owner, trashedAt: { not: null } },
      data: { trashedAt: null },
    });
    for (const tag of ["characters:p1", "character:c1", "trash:p1"]) expect(updateTag).toHaveBeenCalledWith(tag);
  });

  it("restores a place, and reports an item that is not in the trash", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 0 });
    expect(await restoreItem({ projectId: "p1", kind: "place", id: "pl1" })).toEqual({
      success: false,
      error: "That item is not in the trash.",
    });
  });

  it("restores a note only while its owner is live", async () => {
    prismaMock.characterNote.findFirst.mockResolvedValue({ characterId: "c1" });
    prismaMock.characterNote.updateMany.mockResolvedValue({ count: 1 });
    expect((await restoreItem({ projectId: "p1", kind: "characterNote", id: "n1" })).success).toBe(true);
    expect(prismaMock.characterNote.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "n1", trashedAt: { not: null }, character: { ...owner, trashedAt: null, archivedAt: null } },
      }),
    );
    expect(updateTag).toHaveBeenCalledWith("character-notes:c1");

    prismaMock.placeNote.findFirst.mockResolvedValue(null);
    expect((await restoreItem({ projectId: "p1", kind: "placeNote", id: "n2" })).success).toBe(false);
    expect(prismaMock.placeNote.updateMany).not.toHaveBeenCalled();
  });

  it("restores a node with what was trashed with it, brings back a trashed parent, and puts them at the end", async () => {
    // ch (T1) holds s1 (trashed alone earlier, T0) and s2 (trashed with it, T1); restoring s1 needs ch back, but not s2.
    const nodes = [
      { id: "ch", parentId: null, trashedAt: T1 },
      { id: "s1", parentId: "ch", trashedAt: T0 },
      { id: "s2", parentId: "ch", trashedAt: T1 },
    ];
    prismaMock.manuscriptNode.findMany.mockImplementation(async (args: { select: Record<string, boolean> }) =>
      "trashedAt" in args.select ? nodes : [],
    );

    const result = await restoreItem({ projectId: "p1", kind: "node", id: "s1" });

    expect(result.success).toBe(true);
    expect(prismaMock.manuscriptNode.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s1"] }, projectId: "p1" },
      data: { trashedAt: null },
    });
    expect(prismaMock.manuscriptNode.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["ch"] }, projectId: "p1" },
      data: { trashedAt: null },
    });
    expect(prismaMock.manuscriptNode.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["s1", "ch"] }, projectId: "p1" },
      data: { position: 1_000_000 },
    });
    for (const tag of ["manuscript:p1", "stats:p1", "scene:s1", "scene:ch", "trash:p1"]) expect(updateTag).toHaveBeenCalledWith(tag);
    expect(updateTag).not.toHaveBeenCalledWith("scene:s2");
  });

  it("does nothing for a node that is not trashed or a project that is not the user's", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue([{ id: "a", parentId: null, trashedAt: null }]);
    expect((await restoreItem({ projectId: "p1", kind: "node", id: "a" })).success).toBe(false);
    prismaMock.$queryRaw.mockResolvedValue([]);
    expect((await restoreItem({ projectId: "p1", kind: "node", id: "a" })).success).toBe(false);
    expect(prismaMock.manuscriptNode.updateMany).not.toHaveBeenCalled();
  });
});

describe("deleteItemPermanently", () => {
  it("deletes only a trashed character of the user's own project", async () => {
    prismaMock.character.deleteMany.mockResolvedValue({ count: 1 });
    expect((await deleteItemPermanently({ projectId: "p1", kind: "character", id: "c1" })).success).toBe(true);
    expect(prismaMock.character.deleteMany).toHaveBeenCalledWith({ where: { id: "c1", ...owner, trashedAt: { not: null } } });
    expect(updateTag).toHaveBeenCalledWith("trash:p1");
  });

  it("refuses an item that is not in the trash", async () => {
    prismaMock.place.deleteMany.mockResolvedValue({ count: 0 });
    expect((await deleteItemPermanently({ projectId: "p1", kind: "place", id: "pl1" })).success).toBe(false);
  });

  it("deletes a trashed node (its subtree follows by cascade) and expires every scene under it", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue([
      { id: "ch", parentId: null, trashedAt: T1 },
      { id: "s1", parentId: "ch", trashedAt: T1 },
    ]);
    expect((await deleteItemPermanently({ projectId: "p1", kind: "node", id: "ch" })).success).toBe(true);
    expect(prismaMock.manuscriptNode.deleteMany).toHaveBeenCalledWith({ where: { id: "ch", projectId: "p1" } });
    for (const tag of ["scene:ch", "scene:s1", "stats:p1"]) expect(updateTag).toHaveBeenCalledWith(tag);
  });

  it("never deletes a live node", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue([{ id: "ch", parentId: null, trashedAt: null }]);
    expect((await deleteItemPermanently({ projectId: "p1", kind: "node", id: "ch" })).success).toBe(false);
    expect(prismaMock.manuscriptNode.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes a note of a live owner", async () => {
    prismaMock.placeNote.findFirst.mockResolvedValue({ placeId: "pl1" });
    prismaMock.placeNote.deleteMany.mockResolvedValue({ count: 1 });
    expect((await deleteItemPermanently({ projectId: "p1", kind: "placeNote", id: "n1" })).success).toBe(true);
    expect(prismaMock.placeNote.deleteMany).toHaveBeenCalledWith({ where: { id: "n1", placeId: "pl1" } });
  });
});

describe("unarchiveItem", () => {
  it("unarchives only an archived, live character of the user's own project", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    expect((await unarchiveItem({ projectId: "p1", kind: "character", id: "c1" })).success).toBe(true);
    expect(prismaMock.character.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", projectId: "p1", project: { userId: "user-1" }, trashedAt: null, archivedAt: { not: null } },
      data: { archivedAt: null },
    });
    for (const tag of ["characters:p1", "archive:p1"]) expect(updateTag).toHaveBeenCalledWith(tag);
  });

  it("unarchives a place and reports one that is not archived", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 0 });
    expect((await unarchiveItem({ projectId: "p1", kind: "place", id: "pl1" })).success).toBe(false);
    expect((await unarchiveItem({ projectId: "p1", kind: "node" as "place", id: "x" })).success).toBe(false);
  });
});

describe("trashArchivedItem", () => {
  it("moves an archived character from the Archive to the Trash in one update", async () => {
    prismaMock.character.updateMany.mockResolvedValue({ count: 1 });
    expect((await trashArchivedItem({ projectId: "p1", kind: "character", id: "c1" })).success).toBe(true);
    expect(prismaMock.character.updateMany).toHaveBeenCalledWith({
      where: { id: "c1", projectId: "p1", project: { userId: "user-1" }, trashedAt: null, archivedAt: { not: null } },
      data: { trashedAt: expect.any(Date), archivedAt: null },
    });
    for (const tag of ["characters:p1", "archive:p1", "trash:p1"]) expect(updateTag).toHaveBeenCalledWith(tag);
  });

  it("works for places and refuses an item that is not archived", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 0 });
    expect((await trashArchivedItem({ projectId: "p1", kind: "place", id: "pl1" })).success).toBe(false);
    getCurrentUserMock.mockResolvedValue(null);
    expect((await trashArchivedItem({ projectId: "p1", kind: "place", id: "pl1" })).success).toBe(false);
  });
});
