import { describe, it, expect, vi } from "vitest";
import "@/test/mock-prisma";
import { seedDemoProject } from "@/lib/demo-seed";

function fakeTx() {
  return {
    project: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
    manuscriptNode: { createMany: vi.fn() },
    character: { createMany: vi.fn() },
    characterNote: { createMany: vi.fn() },
  };
}

describe("seedDemoProject", () => {
  it("creates one project for the user and returns its id", async () => {
    const tx = fakeTx();
    await expect(seedDemoProject(tx as never, "u1")).resolves.toBe("p1");
    expect(tx.project.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "u1" }) }));
  });

  it("seeds a valid tree: parents before children, scenes under chapters, chapters under parts or the book", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const nodes = tx.manuscriptNode.createMany.mock.calls[0][0].data as { id: string; parentId: string | null; type: string; projectId: string }[];
    const seen = new Map<string, string>();
    for (const node of nodes) {
      expect(node.projectId).toBe("p1");
      if (node.parentId) {
        expect(seen.has(node.parentId)).toBe(true); // the parent was inserted earlier in the batch
        const parentType = seen.get(node.parentId);
        if (node.type === "SCENE") expect(parentType).toBe("CHAPTER");
        if (node.type === "CHAPTER") expect(parentType).toBe("PART");
        expect(node.type).not.toBe("PART");
      } else {
        expect(node.type).not.toBe("SCENE");
      }
      seen.set(node.id, node.type);
    }
    expect(nodes.filter((n) => n.type === "SCENE").length).toBeGreaterThanOrEqual(3);
  });

  it("gives every scene content and a word count, and no other node any", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const nodes = tx.manuscriptNode.createMany.mock.calls[0][0].data as { type: string; content?: unknown; wordCount?: number }[];
    for (const node of nodes) {
      if (node.type === "SCENE") {
        expect(node.content).toBeTruthy();
        expect(node.wordCount).toBeGreaterThan(10);
      } else {
        expect(node.content).toBeUndefined();
      }
    }
  });

  it("seeds main and supporting characters with blank fields stored as null, and notes for the ones that have them", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const characters = tx.character.createMany.mock.calls[0][0].data as { id: string; role: string; name: string; goal: string | null }[];
    expect(new Set(characters.map((c) => c.role))).toEqual(new Set(["MAIN", "SUPPORTING"]));
    expect(characters.some((c) => c.goal === null)).toBe(true);
    expect(characters.some((c) => c.goal === "")).toBe(false);

    const notes = tx.characterNote.createMany.mock.calls[0][0].data as { characterId: string; content: string }[];
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(characters.some((c) => c.id === note.characterId)).toBe(true);
  });
});
