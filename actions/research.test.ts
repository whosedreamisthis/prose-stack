import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import {
  addStarterFolders,
  createResearchFolder,
  createResearchItem,
  moveResearchFolder,
  moveResearchItem,
  renameResearchFolder,
  setResearchItemLink,
  trashResearchFolder,
  trashResearchItem,
  updateResearchItem,
} from "@/actions/research";
import { MAX_RESEARCH_FOLDERS, MAX_RESEARCH_ITEMS, STARTER_FOLDERS } from "@/lib/research-config";

const live = { trashedAt: null, archivedAt: null };

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
  // The project lock finds the user's project unless a test says otherwise.
  prismaMock.$queryRaw.mockResolvedValue([{ id: "p1" }]);
});

describe("signed-out and invalid calls", () => {
  it("rejects signed-out callers before touching the database", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect(await createResearchItem({ projectId: "p1", folderId: null, type: "NOTE" })).toEqual({ success: false, error: "You need to be signed in." });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a project that is not the user's", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    const result = await createResearchFolder({ projectId: "p1", parentId: null });
    expect(result).toEqual({ success: false, error: "Project not found." });
    expect(prismaMock.researchFolder.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown item type", async () => {
    const result = await createResearchItem({ projectId: "p1", folderId: null, type: "IMAGE" as "NOTE" });
    expect(result.success).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("createResearchFolder", () => {
  it("adds a folder at the end of its parent and expires the tree", async () => {
    prismaMock.researchFolder.findFirst.mockResolvedValue({ id: "a" });
    prismaMock.researchFolder.findMany.mockResolvedValue([
      { id: "a", parentId: null, position: 0 },
      { id: "b", parentId: "a", position: 0 },
    ]);
    prismaMock.researchFolder.create.mockResolvedValue({ id: "client-id-1" });

    const result = await createResearchFolder({ projectId: "p1", parentId: "a", id: "client-id-1" });

    expect(result).toEqual({ success: true, data: { id: "client-id-1" } });
    expect(prismaMock.researchFolder.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: "client-id-1", projectId: "p1", parentId: "a", name: "New folder", position: 1 } }),
    );
    expect(updateTag).toHaveBeenCalledWith("research:p1");
  });

  it("refuses a parent that is not a live folder of the project", async () => {
    prismaMock.researchFolder.findFirst.mockResolvedValue(null);
    expect(await createResearchFolder({ projectId: "p1", parentId: "x" })).toEqual({ success: false, error: "Folder not found." });
    expect(prismaMock.researchFolder.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "x", projectId: "p1", ...live } }));
  });

  it("refuses past the folder limit", async () => {
    prismaMock.researchFolder.findMany.mockResolvedValue(Array.from({ length: MAX_RESEARCH_FOLDERS }, (_, i) => ({ id: `f${i}`, parentId: null, position: i })));
    const result = await createResearchFolder({ projectId: "p1", parentId: null });
    expect(result).toEqual({ success: false, error: `A project can have up to ${MAX_RESEARCH_FOLDERS} research folders.` });
  });

  it("refuses a fifth level of nesting", async () => {
    prismaMock.researchFolder.findFirst.mockResolvedValue({ id: "d" });
    prismaMock.researchFolder.findMany.mockResolvedValue([
      { id: "a", parentId: null, position: 0 },
      { id: "b", parentId: "a", position: 0 },
      { id: "c", parentId: "b", position: 0 },
      { id: "d", parentId: "c", position: 0 },
    ]);
    const result = await createResearchFolder({ projectId: "p1", parentId: "d" });
    expect(result).toEqual({ success: false, error: "Folders can only nest 4 levels deep." });
  });
});

describe("createResearchItem", () => {
  it("creates a note with an empty document at the end of its folder", async () => {
    prismaMock.researchItem.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);
    prismaMock.researchItem.create.mockResolvedValue({ id: "n1" });

    const result = await createResearchItem({ projectId: "p1", folderId: null, type: "NOTE" });

    expect(result).toEqual({ success: true, data: { id: "n1" } });
    expect(prismaMock.researchItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "p1", folderId: null, type: "NOTE", title: "New note", position: 2, content: expect.objectContaining({ type: "doc" }) }),
      }),
    );
  });

  it("refuses past the item limit", async () => {
    prismaMock.researchItem.count.mockResolvedValue(MAX_RESEARCH_ITEMS);
    const result = await createResearchItem({ projectId: "p1", folderId: null, type: "LINK" });
    expect(result).toEqual({ success: false, error: `A project can have up to ${MAX_RESEARCH_ITEMS} research items.` });
    expect(prismaMock.researchItem.create).not.toHaveBeenCalled();
  });
});

describe("renameResearchFolder and updateResearchItem", () => {
  it("scopes a rename to the user's live folder", async () => {
    prismaMock.researchFolder.updateMany.mockResolvedValue({ count: 1 });
    expect((await renameResearchFolder({ projectId: "p1", folderId: "a", name: "  Maps  " })).success).toBe(true);
    expect(prismaMock.researchFolder.updateMany).toHaveBeenCalledWith({
      where: { id: "a", projectId: "p1", project: { userId: "user-1" }, ...live },
      data: { name: "Maps" },
    });
  });

  it("refuses a blank name", async () => {
    expect((await renameResearchFolder({ projectId: "p1", folderId: "a", name: "   " })).success).toBe(false);
    expect(prismaMock.researchFolder.updateMany).not.toHaveBeenCalled();
  });

  it("saves a link's address and stores a blank description as null", async () => {
    prismaMock.researchItem.updateMany.mockResolvedValue({ count: 1 });
    const result = await updateResearchItem({ projectId: "p1", itemId: "l1", changes: { url: "https://example.com/a", description: "" } });
    expect(result.success).toBe(true);
    expect(prismaMock.researchItem.updateMany).toHaveBeenCalledWith({
      where: { id: "l1", projectId: "p1", project: { userId: "user-1" }, ...live },
      data: { url: "https://example.com/a", description: null },
    });
    expect(updateTag).toHaveBeenCalledWith("research-item:l1");
    // Only the title shows in the tree, so the tree stays cached.
    expect(updateTag).not.toHaveBeenCalledWith("research:p1");
  });

  it("refuses addresses that are not http or https", async () => {
    for (const url of ["javascript:alert(1)", "data:text/html,hi", "file:///etc/passwd", "not a url"]) {
      expect((await updateResearchItem({ projectId: "p1", itemId: "l1", changes: { url } })).success).toBe(false);
    }
    expect(prismaMock.researchItem.updateMany).not.toHaveBeenCalled();
  });

  it("reports an item that is missing or not the user's", async () => {
    prismaMock.researchItem.updateMany.mockResolvedValue({ count: 0 });
    expect(await updateResearchItem({ projectId: "p1", itemId: "x", changes: { title: "Hi" } })).toEqual({ success: false, error: "Item not found." });
  });
});

describe("moveResearchFolder", () => {
  const tree = [
    { id: "a", parentId: null, position: 0 },
    { id: "b", parentId: "a", position: 0 },
    { id: "d", parentId: null, position: 1 },
  ];

  it("refuses moving a folder into its own subfolder, on the server", async () => {
    prismaMock.researchFolder.findMany.mockResolvedValue(tree);
    const result = await moveResearchFolder({ projectId: "p1", folderId: "a", parentId: "b", index: 0 });
    expect(result).toEqual({ success: false, error: "A folder can't go inside itself." });
    expect(prismaMock.researchFolder.update).not.toHaveBeenCalled();
  });

  it("moves a folder under another and closes the gap it leaves", async () => {
    prismaMock.researchFolder.findMany.mockResolvedValue(tree);
    expect((await moveResearchFolder({ projectId: "p1", folderId: "a", parentId: "d", index: 0 })).success).toBe(true);
    expect(prismaMock.researchFolder.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { position: 0, parentId: "d" } });
    expect(prismaMock.researchFolder.update).toHaveBeenCalledWith({ where: { id: "d" }, data: { position: 0 } });
  });

  it("refuses a destination that is not a live folder", async () => {
    prismaMock.researchFolder.findMany.mockResolvedValue(tree);
    expect(await moveResearchFolder({ projectId: "p1", folderId: "a", parentId: "gone", index: 0 })).toEqual({ success: false, error: "Folder not found." });
  });
});

describe("moveResearchItem", () => {
  it("moves an item into a folder at the index and renumbers both folders", async () => {
    prismaMock.researchFolder.findFirst.mockResolvedValue({ id: "a" });
    prismaMock.researchItem.findFirst.mockResolvedValue({ folderId: null });
    prismaMock.researchItem.findMany
      .mockResolvedValueOnce([{ id: "x", position: 0 }])
      .mockResolvedValueOnce([{ id: "y", position: 1 }]);

    expect((await moveResearchItem({ projectId: "p1", itemId: "i1", folderId: "a", index: 0 })).success).toBe(true);
    expect(prismaMock.researchItem.update).toHaveBeenCalledWith({ where: { id: "i1" }, data: { position: 0, folderId: "a" } });
    expect(prismaMock.researchItem.update).toHaveBeenCalledWith({ where: { id: "x" }, data: { position: 1 } });
    expect(prismaMock.researchItem.update).toHaveBeenCalledWith({ where: { id: "y" }, data: { position: 0 } });
  });

  it("refuses an item that is not the project's", async () => {
    prismaMock.researchItem.findFirst.mockResolvedValue(null);
    expect(await moveResearchItem({ projectId: "p1", itemId: "x", folderId: null, index: 0 })).toEqual({ success: false, error: "Item not found." });
  });
});

describe("setResearchItemLink", () => {
  it("links to a live character of the same project", async () => {
    prismaMock.character.findFirst.mockResolvedValue({ id: "c1" });
    prismaMock.researchItem.updateMany.mockResolvedValue({ count: 1 });
    expect((await setResearchItemLink({ projectId: "p1", itemId: "i1", link: { kind: "character", id: "c1" } })).success).toBe(true);
    expect(prismaMock.character.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1", projectId: "p1", project: { userId: "user-1" }, ...live } }),
    );
    expect(prismaMock.researchItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { characterId: "c1", placeId: null, sceneId: null } }),
    );
  });

  it("refuses a target from another project or user", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue(null);
    const result = await setResearchItemLink({ projectId: "p1", itemId: "i1", link: { kind: "scene", id: "s9" } });
    expect(result).toEqual({ success: false, error: "That scene was not found." });
    expect(prismaMock.researchItem.updateMany).not.toHaveBeenCalled();
  });

  it("clears the link", async () => {
    prismaMock.researchItem.updateMany.mockResolvedValue({ count: 1 });
    expect((await setResearchItemLink({ projectId: "p1", itemId: "i1", link: null })).success).toBe(true);
    expect(prismaMock.researchItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { characterId: null, placeId: null, sceneId: null } }),
    );
  });
});

describe("trash", () => {
  it("trashes a folder with its whole subtree and their items at one moment", async () => {
    prismaMock.researchFolder.findMany.mockResolvedValue([
      { id: "a", parentId: null, position: 0 },
      { id: "b", parentId: "a", position: 0 },
      { id: "d", parentId: null, position: 1 },
    ]);
    expect((await trashResearchFolder({ projectId: "p1", folderId: "a" })).success).toBe(true);
    const folderCall = prismaMock.researchFolder.updateMany.mock.calls[0][0];
    const itemCall = prismaMock.researchItem.updateMany.mock.calls[0][0];
    expect(folderCall.where.id).toEqual({ in: ["a", "b"] });
    expect(itemCall.where.folderId).toEqual({ in: ["a", "b"] });
    expect(folderCall.data.trashedAt).toBe(itemCall.data.trashedAt);
    expect(updateTag).toHaveBeenCalledWith("trash:p1");
  });

  it("trashes one item, scoped to the user", async () => {
    prismaMock.researchItem.updateMany.mockResolvedValue({ count: 1 });
    expect((await trashResearchItem({ projectId: "p1", itemId: "i1" })).success).toBe(true);
    expect(prismaMock.researchItem.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "i1", projectId: "p1", project: { userId: "user-1" }, ...live } }),
    );
  });
});

describe("addStarterFolders", () => {
  it("adds the starter folders to a project with none", async () => {
    prismaMock.researchFolder.count.mockResolvedValue(0);
    expect((await addStarterFolders({ projectId: "p1" })).success).toBe(true);
    const { data } = prismaMock.researchFolder.createMany.mock.calls[0][0];
    expect(data.map((f: { name: string }) => f.name)).toEqual([...STARTER_FOLDERS]);
  });

  it("refuses when the project already has folders", async () => {
    prismaMock.researchFolder.count.mockResolvedValue(2);
    expect((await addStarterFolders({ projectId: "p1" })).success).toBe(false);
    expect(prismaMock.researchFolder.createMany).not.toHaveBeenCalled();
  });
});
