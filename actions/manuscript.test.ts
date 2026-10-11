import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createNode, moveNode, renameNode, saveScene, saveSceneSummary } from "@/actions/manuscript";
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
      where: { id: "n1", projectId: "p1", project: { userId: "user-1" } },
      data: { title: "The Storm" },
    });
  });

  it("reports not found when nothing matched", async () => {
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 0 });
    expect((await renameNode({ projectId: "p1", nodeId: "n1", title: "x" })).success).toBe(false);
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
