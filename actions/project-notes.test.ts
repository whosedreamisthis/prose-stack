import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { createProjectNote, trashProjectNote, updateProjectNote } from "@/actions/project-notes";
import { MAX_NOTES_PER_PROJECT } from "@/lib/project-note-config";

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createProjectNote", () => {
  it("rejects signed-out callers and an empty note", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await createProjectNote({ projectId: "p1", content: "x" })).success).toBe(false);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    expect((await createProjectNote({ projectId: "p1", content: "  ", title: " " })).success).toBe(false);
    expect(prismaMock.projectNote.create).not.toHaveBeenCalled();
  });

  it("adds a note to the user's own project and expires the notes", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "p1", _count: { notes: 2 } });
    prismaMock.projectNote.create.mockResolvedValue({ id: "n1" });

    const result = await createProjectNote({ projectId: "p1", title: "Theme", content: "Loss", id: "client-id-1" });

    expect(result).toEqual({ success: true, data: { id: "n1" } });
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "user-1" } }));
    expect(prismaMock.projectNote.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: "client-id-1", projectId: "p1", title: "Theme", content: "Loss" } }),
    );
    expect(updateTag).toHaveBeenCalledWith("project-notes:p1");
  });

  it("refuses a project that is not the user's, and a full list", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect((await createProjectNote({ projectId: "other", content: "x" })).success).toBe(false);
    prismaMock.project.findFirst.mockResolvedValue({ id: "p1", _count: { notes: MAX_NOTES_PER_PROJECT } });
    expect((await createProjectNote({ projectId: "p1", content: "x" })).success).toBe(false);
    expect(prismaMock.projectNote.create).not.toHaveBeenCalled();
  });
});

describe("updateProjectNote and trashProjectNote", () => {
  it("only touch a live note of the user's own project", async () => {
    prismaMock.projectNote.updateMany.mockResolvedValue({ count: 1 });
    expect((await updateProjectNote({ projectId: "p1", noteId: "n1", content: "New" })).success).toBe(true);
    expect(prismaMock.projectNote.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", projectId: "p1", trashedAt: null, project: { userId: "user-1" } },
      data: { content: "New" },
    });

    expect((await trashProjectNote({ projectId: "p1", noteId: "n1" })).success).toBe(true);
    expect(updateTag).toHaveBeenCalledWith("trash:p1");
  });

  it("report a note that is missing", async () => {
    prismaMock.projectNote.updateMany.mockResolvedValue({ count: 0 });
    expect((await updateProjectNote({ projectId: "p1", noteId: "x", content: "y" })).success).toBe(false);
    expect((await trashProjectNote({ projectId: "p1", noteId: "x" })).success).toBe(false);
  });
});
