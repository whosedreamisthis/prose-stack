import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { createNode, moveNode, renameNode, saveScene, saveSceneSummary, trashNode } from "@/actions/manuscript";
import { docFromText } from "@/lib/manuscript-text";

function useInteractiveTransaction() {
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
}

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  useInteractiveTransaction();
  prismaMock.$queryRaw.mockResolvedValue([{ id: "p1" }]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createNode", () => {
  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await createNode({ projectId: "p1", parentId: null, type: "CHAPTER" })).success).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a scene directly under the book, server-side", async () => {
    const result = await createNode({ projectId: "p1", parentId: null, type: "SCENE" });
    expect(result).toEqual({ success: false, error: "That item can't go there." });
    expect(prismaMock.manuscriptNode.create).not.toHaveBeenCalled();
  });

  it("rejects a chapter inside a chapter", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ type: "CHAPTER" });
    const result = await createNode({ projectId: "p1", parentId: "c1", type: "CHAPTER" });
    expect(result.success).toBe(false);
    expect(prismaMock.manuscriptNode.create).not.toHaveBeenCalled();
  });

  it("adds a scene at the end of a chapter with a numbered title", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ type: "CHAPTER" });
    prismaMock.manuscriptNode.findMany.mockResolvedValue([{ type: "SCENE" }, { type: "SCENE" }]);
    prismaMock.manuscriptNode.create.mockResolvedValue({ id: "s3" });

    const result = await createNode({ projectId: "p1", parentId: "c1", type: "SCENE" });

    expect(result).toEqual({ success: true, data: { id: "s3" } });
    expect(prismaMock.manuscriptNode.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { projectId: "p1", parentId: "c1", type: "SCENE", title: "Scene 3", position: 2 } }),
    );
  });

  it("creates the row under the id the client chose, so it can show before the server answers", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ type: "PART" });
    prismaMock.manuscriptNode.findMany.mockResolvedValue([]);
    prismaMock.manuscriptNode.create.mockResolvedValue({ id: "client-id-1" });

    await createNode({ projectId: "p1", parentId: "part1", type: "CHAPTER", id: "client-id-1" });

    expect(prismaMock.manuscriptNode.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ id: "client-id-1", title: "Chapter 1" }) }),
    );
  });

  it("rejects a malformed client id", async () => {
    const result = await createNode({ projectId: "p1", parentId: null, type: "CHAPTER", id: "bad id!" });
    expect(result.success).toBe(false);
    expect(prismaMock.manuscriptNode.create).not.toHaveBeenCalled();
  });

  it("reports not found when the project is not the caller's", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    expect(await createNode({ projectId: "p1", parentId: null, type: "CHAPTER" })).toEqual({ success: false, error: "Item not found." });
  });
});

describe("renameNode", () => {
  it("validates the title", async () => {
    const result = await renameNode({ projectId: "p1", nodeId: "n1", title: "  " });
    expect(result).toEqual({ success: false, error: "Title is required" });
  });

  it("renames only a node in the caller's project", async () => {
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 1 });
    await renameNode({ projectId: "p1", nodeId: "n1", title: " The Storm " });
    expect(prismaMock.manuscriptNode.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", projectId: "p1", trashedAt: null, project: { userId: "user-1" } },
      data: { title: "The Storm" },
    });
  });

  it("reports not found when nothing matched", async () => {
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 0 });
    expect((await renameNode({ projectId: "p1", nodeId: "n1", title: "x" })).success).toBe(false);
  });
});

describe("trashNode", () => {
  const tree = [
    { id: "part", parentId: null, position: 0 },
    { id: "ch1", parentId: "part", position: 0 },
    { id: "ch2", parentId: "part", position: 1 },
    { id: "s1", parentId: "ch1", position: 0 },
    { id: "s2", parentId: "ch2", position: 0 },
  ];

  it("rejects signed-out callers and an item that is not found", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await trashNode({ projectId: "p1", nodeId: "ch1" })).success).toBe(false);

    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.manuscriptNode.findMany.mockResolvedValue(tree);
    expect(await trashNode({ projectId: "p1", nodeId: "gone" })).toEqual({ success: false, error: "Item not found." });
    expect(prismaMock.manuscriptNode.updateMany).not.toHaveBeenCalled();
  });

  it("does nothing when the project is not the user's", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    expect((await trashNode({ projectId: "p1", nodeId: "ch1" })).success).toBe(false);
    expect(prismaMock.manuscriptNode.updateMany).not.toHaveBeenCalled();
  });

  it("trashes a chapter with its scenes in one update and renumbers the siblings left behind", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue(tree);

    const result = await trashNode({ projectId: "p1", nodeId: "ch1" });

    expect(result).toEqual({ success: true, data: { trashedIds: ["ch1", "s1"] } });
    expect(prismaMock.manuscriptNode.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["ch1", "s1"] }, projectId: "p1" },
      data: { trashedAt: expect.any(Date) },
    });
    // ch2 moves up from position 1 to 0; nothing else needs renumbering.
    expect(prismaMock.manuscriptNode.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.manuscriptNode.update).toHaveBeenCalledWith({ where: { id: "ch2" }, data: { position: 0 } });
  });

  it("expires the outline, the word totals and each trashed scene", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue(tree);
    await trashNode({ projectId: "p1", nodeId: "part" });
    for (const tag of ["manuscript:p1", "stats:p1", "scene:s1", "scene:s2"]) expect(updateTag).toHaveBeenCalledWith(tag);
  });
});

describe("moveNode", () => {
  const nodes = [
    { id: "c1", parentId: null, type: "CHAPTER", title: "c1", position: 0 },
    { id: "s1", parentId: "c1", type: "SCENE", title: "s1", position: 0 },
    { id: "s2", parentId: "c1", type: "SCENE", title: "s2", position: 1 },
  ];

  it("rewrites positions in one transaction", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue(nodes);
    const result = await moveNode({ projectId: "p1", nodeId: "s2", parentId: "c1", index: 0 });
    expect(result.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.manuscriptNode.update).toHaveBeenCalledWith({ where: { id: "s2" }, data: { parentId: "c1", position: 0 } });
    expect(prismaMock.manuscriptNode.update).toHaveBeenCalledWith({ where: { id: "s1" }, data: { parentId: "c1", position: 1 } });
  });

  it("rejects hierarchy violations without writing", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue(nodes);
    const result = await moveNode({ projectId: "p1", nodeId: "s1", parentId: null, index: 0 });
    expect(result).toEqual({ success: false, error: "That item can't go there." });
    expect(prismaMock.manuscriptNode.update).not.toHaveBeenCalled();
  });
});

describe("saveScene", () => {
  const content = docFromText("Once upon a time...");

  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await saveScene({ projectId: "p1", nodeId: "s1", content })).success).toBe(false);
  });

  it("computes the word count on the server and snapshots the day's starting total", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.manuscriptNode.aggregate.mockResolvedValue({ _sum: { wordCount: 120 } });
    prismaMock.manuscriptNode.update.mockResolvedValue({ updatedAt: new Date(5000) });

    const result = await saveScene({ projectId: "p1", nodeId: "s1", content, wordCount: 9999 } as Parameters<typeof saveScene>[0]);

    expect(result).toEqual({ success: true, data: { updatedAt: 5000 } });
    expect(prismaMock.manuscriptNode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1" }, data: { content, wordCount: 4 } }),
    );
    expect(prismaMock.dailyWordCount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ projectId: "p1", startWords: 120 }), update: {} }),
    );
  });

  it("does not save a scene that is not the caller's", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue(null);
    const result = await saveScene({ projectId: "p1", nodeId: "s1", content });
    expect(result).toEqual({ success: false, error: "Item not found." });
    expect(prismaMock.manuscriptNode.update).not.toHaveBeenCalled();
  });

  it("returns a retryable error when the database fails", async () => {
    prismaMock.manuscriptNode.findFirst.mockRejectedValue(new Error("db down"));
    const result = await saveScene({ projectId: "p1", nodeId: "s1", content });
    expect(result.success).toBe(false);
  });
});

describe("saveSceneSummary", () => {
  it("stores a blank summary as null", async () => {
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 1 });
    await saveSceneSummary({ projectId: "p1", nodeId: "s1", summary: "   " });
    expect(prismaMock.manuscriptNode.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { summary: null } }));
  });
});

describe("cache invalidation", () => {
  it("expires the scene, word totals and project list on save, but leaves the outline cached", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.manuscriptNode.aggregate.mockResolvedValue({ _sum: { wordCount: 0 } });
    prismaMock.manuscriptNode.update.mockResolvedValue({ updatedAt: new Date() });
    prismaMock.project.update.mockResolvedValue({});
    await saveScene({ projectId: "p1", nodeId: "s1", content: docFromText("Hello there") });
    expect(
      vi
        .mocked(updateTag)
        .mock.calls.map(([tag]) => tag)
        .sort(),
    ).toEqual(["projects:user-1", "scene:s1", "stats:p1"]);
  });

  it("expires the outline and the scene when a node is renamed", async () => {
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 1 });
    await renameNode({ projectId: "p1", nodeId: "s1", title: "New title" });
    expect(
      vi
        .mocked(updateTag)
        .mock.calls.map(([tag]) => tag)
        .sort(),
    ).toEqual(["manuscript:p1", "scene:s1"]);
  });
});
