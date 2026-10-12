import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import {
  archivePlace,
  createPlace,
  createPlaceNote,
  trashPlaceNote,
  setPlaceCharacters,
  trashPlace,
  updatePlace,
  updatePlaceNote,
} from "@/actions/places";
import { MAX_NOTES_PER_PLACE } from "@/lib/place-config";

const owned = { project: { userId: "user-1" } };

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createPlace", () => {
  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await createPlace({ projectId: "p1" })).success).toBe(false);
    expect(prismaMock.place.create).not.toHaveBeenCalled();
  });

  it("rejects a project that is not the user's", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    const result = await createPlace({ projectId: "p1" });
    expect(result.success).toBe(false);
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "user-1" } }));
    expect(prismaMock.place.create).not.toHaveBeenCalled();
  });

  it("creates a named place under the client's id and expires the list", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "p1" });
    prismaMock.place.create.mockResolvedValue({ id: "client-id-1" });

    const result = await createPlace({ projectId: "p1", id: "client-id-1" });

    expect(result).toEqual({ success: true, data: { id: "client-id-1" } });
    expect(prismaMock.place.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id: "client-id-1", projectId: "p1", name: "New place" },
      }),
    );
    expect(updateTag).toHaveBeenCalledWith("places:p1");
  });
});

describe("updatePlace", () => {
  it("scopes the update to the user's project and live places", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 1 });
    await updatePlace({
      projectId: "p1",
      placeId: "pl1",
      changes: { sounds: "Gulls" },
    });
    expect(prismaMock.place.updateMany).toHaveBeenCalledWith({
      where: {
        id: "pl1",
        projectId: "p1",
        ...owned,
        trashedAt: null,
        archivedAt: null,
      },
      data: { sounds: "Gulls" },
    });
  });

  it("stores a blank field as null but keeps the name trimmed", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 1 });
    await updatePlace({
      projectId: "p1",
      placeId: "pl1",
      changes: { name: "  Harbour  ", smell: "   " },
    });
    expect(prismaMock.place.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "Harbour", smell: null } }));
  });

  it("expires the list only when the name changed", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 1 });
    await updatePlace({
      projectId: "p1",
      placeId: "pl1",
      changes: { smell: "Salt" },
    });
    expect(updateTag).toHaveBeenCalledWith("place:pl1");
    expect(updateTag).not.toHaveBeenCalledWith("places:p1");

    await updatePlace({
      projectId: "p1",
      placeId: "pl1",
      changes: { name: "Harbour" },
    });
    expect(updateTag).toHaveBeenCalledWith("places:p1");
  });

  it("rejects a blank name, an unknown field and an empty change", async () => {
    expect(
      (
        await updatePlace({
          projectId: "p1",
          placeId: "pl1",
          changes: { name: "   " },
        })
      ).success,
    ).toBe(false);
    expect(
      (
        await updatePlace({
          projectId: "p1",
          placeId: "pl1",
          changes: { projectId: "x" } as never,
        })
      ).success,
    ).toBe(false);
    expect((await updatePlace({ projectId: "p1", placeId: "pl1", changes: {} })).success).toBe(false);
    expect(prismaMock.place.updateMany).not.toHaveBeenCalled();
  });

  it("reports a place that is missing, trashed or archived", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 0 });
    expect(
      await updatePlace({
        projectId: "p1",
        placeId: "pl1",
        changes: { sounds: "x" },
      }),
    ).toEqual({ success: false, error: "Place not found." });
  });
});

describe("setPlaceCharacters", () => {
  it("replaces the related characters, ignoring duplicate ids", async () => {
    prismaMock.place.findFirst.mockResolvedValue({ id: "pl1" });
    prismaMock.character.count.mockResolvedValue(2);
    prismaMock.place.update.mockResolvedValue({ id: "pl1" });

    const result = await setPlaceCharacters({
      projectId: "p1",
      placeId: "pl1",
      characterIds: ["c1", "c2", "c1"],
    });

    expect(result.success).toBe(true);
    expect(prismaMock.character.count).toHaveBeenCalledWith({
      where: {
        id: { in: ["c1", "c2"] },
        projectId: "p1",
        trashedAt: null,
        archivedAt: null,
      },
    });
    expect(prismaMock.place.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pl1" },
        data: { relatedCharacters: { set: [{ id: "c1" }, { id: "c2" }] } },
      }),
    );
    expect(updateTag).toHaveBeenCalledWith("place:pl1");
  });

  it("can clear the links", async () => {
    prismaMock.place.findFirst.mockResolvedValue({ id: "pl1" });
    prismaMock.character.count.mockResolvedValue(0);
    prismaMock.place.update.mockResolvedValue({ id: "pl1" });
    expect(
      (
        await setPlaceCharacters({
          projectId: "p1",
          placeId: "pl1",
          characterIds: [],
        })
      ).success,
    ).toBe(true);
    expect(prismaMock.place.update).toHaveBeenCalledWith(expect.objectContaining({ data: { relatedCharacters: { set: [] } } }));
  });

  it("rejects a character that is not a live character of the project", async () => {
    prismaMock.place.findFirst.mockResolvedValue({ id: "pl1" });
    prismaMock.character.count.mockResolvedValue(1);
    const result = await setPlaceCharacters({
      projectId: "p1",
      placeId: "pl1",
      characterIds: ["c1", "other-project"],
    });
    expect(result.success).toBe(false);
    expect(prismaMock.place.update).not.toHaveBeenCalled();
  });

  it("rejects a place that is not the user's", async () => {
    prismaMock.place.findFirst.mockResolvedValue(null);
    expect(
      (
        await setPlaceCharacters({
          projectId: "p1",
          placeId: "pl1",
          characterIds: ["c1"],
        })
      ).success,
    ).toBe(false);
    expect(prismaMock.place.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining(owned) }));
    expect(prismaMock.place.update).not.toHaveBeenCalled();
  });
});

describe("trashPlace and archivePlace", () => {
  it("set the matching timestamp on a live place the user owns", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 1 });

    expect((await trashPlace({ projectId: "p1", placeId: "pl1" })).success).toBe(true);
    expect(prismaMock.place.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: "pl1",
        projectId: "p1",
        ...owned,
        trashedAt: null,
        archivedAt: null,
      },
      data: { trashedAt: expect.any(Date) },
    });

    expect((await archivePlace({ projectId: "p1", placeId: "pl1" })).success).toBe(true);
    expect(prismaMock.place.updateMany).toHaveBeenLastCalledWith(expect.objectContaining({ data: { archivedAt: expect.any(Date) } }));
    expect(updateTag).toHaveBeenCalledWith("places:p1");
    // Trashing fills the Trash page, archiving fills the Archive page.
    expect(updateTag).toHaveBeenCalledWith("trash:p1");
    expect(updateTag).toHaveBeenCalledWith("archive:p1");
  });

  it("fail for a place that is already hidden or not the user's", async () => {
    prismaMock.place.updateMany.mockResolvedValue({ count: 0 });
    expect((await trashPlace({ projectId: "p1", placeId: "pl1" })).success).toBe(false);
  });
});

describe("place notes", () => {
  it("creates a trimmed note on a live place under the client's id", async () => {
    prismaMock.place.findFirst.mockResolvedValue({
      id: "pl1",
      _count: { notes: 0 },
    });
    prismaMock.placeNote.create.mockResolvedValue({ id: "note-id-1" });

    const result = await createPlaceNote({
      projectId: "p1",
      placeId: "pl1",
      content: "  Fog at dawn  ",
      id: "note-id-1",
    });

    expect(result).toEqual({ success: true, data: { id: "note-id-1" } });
    expect(prismaMock.place.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "pl1",
          projectId: "p1",
          ...owned,
          trashedAt: null,
          archivedAt: null,
        },
      }),
    );
    expect(prismaMock.placeNote.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id: "note-id-1", placeId: "pl1", content: "Fog at dawn" },
      }),
    );
    expect(updateTag).toHaveBeenCalledWith("place-notes:pl1");
  });

  it("stores a title, clears it with a blank one and refuses a note with neither title nor text", async () => {
    prismaMock.place.findFirst.mockResolvedValue({ id: "pl1", _count: { notes: 0 } });
    prismaMock.placeNote.create.mockResolvedValue({ id: "n1" });
    prismaMock.placeNote.updateMany.mockResolvedValue({ count: 1 });

    expect((await createPlaceNote({ projectId: "p1", placeId: "pl1", title: " Tides ", content: "" })).success).toBe(true);
    expect(prismaMock.placeNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { placeId: "pl1", title: "Tides", content: "" } }),
    );
    expect((await createPlaceNote({ projectId: "p1", placeId: "pl1", title: "", content: " " })).success).toBe(false);

    await updatePlaceNote({ projectId: "p1", placeId: "pl1", noteId: "n1", title: "", content: "Low at noon" });
    expect(prismaMock.placeNote.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: { title: null, content: "Low at noon" } }),
    );
    expect((await updatePlaceNote({ projectId: "p1", placeId: "pl1", noteId: "n1", content: "  " })).success).toBe(false);
  });

  it("rejects an empty note, a hidden place and a full place", async () => {
    expect(
      (
        await createPlaceNote({
          projectId: "p1",
          placeId: "pl1",
          content: "   ",
        })
      ).success,
    ).toBe(false);

    prismaMock.place.findFirst.mockResolvedValue(null);
    expect((await createPlaceNote({ projectId: "p1", placeId: "pl1", content: "x" })).success).toBe(false);

    prismaMock.place.findFirst.mockResolvedValue({
      id: "pl1",
      _count: { notes: MAX_NOTES_PER_PLACE },
    });
    expect((await createPlaceNote({ projectId: "p1", placeId: "pl1", content: "x" })).success).toBe(false);
    expect(prismaMock.placeNote.create).not.toHaveBeenCalled();
  });

  it("updates and trashes only the user's own live notes of that place", async () => {
    prismaMock.placeNote.updateMany.mockResolvedValue({ count: 1 });
    const where = {
      id: "n1",
      placeId: "pl1",
      trashedAt: null,
      place: { projectId: "p1", ...owned },
    };

    expect(
      (
        await updatePlaceNote({
          projectId: "p1",
          placeId: "pl1",
          noteId: "n1",
          content: " Edited ",
        })
      ).success,
    ).toBe(true);
    expect(prismaMock.placeNote.updateMany).toHaveBeenCalledWith({
      where,
      data: { content: "Edited" },
    });

    expect((await trashPlaceNote({ projectId: "p1", placeId: "pl1", noteId: "n1" })).success).toBe(true);
    expect(prismaMock.placeNote.updateMany).toHaveBeenLastCalledWith({ where, data: { trashedAt: expect.any(Date) } });
  });

  it("reports a note that is missing or not the user's", async () => {
    prismaMock.placeNote.updateMany.mockResolvedValue({ count: 0 });
    expect(
      (
        await updatePlaceNote({
          projectId: "p1",
          placeId: "pl1",
          noteId: "n1",
          content: "x",
        })
      ).success,
    ).toBe(false);
    expect((await trashPlaceNote({ projectId: "p1", placeId: "pl1", noteId: "n1" })).success).toBe(false);
  });
});
