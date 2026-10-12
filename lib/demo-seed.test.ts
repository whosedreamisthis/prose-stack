import { describe, it, expect, vi } from "vitest";
import "@/test/mock-prisma";
import { seedDemoProject } from "@/lib/demo-seed";

function fakeTx() {
  return {
    project: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
    manuscriptNode: { createMany: vi.fn() },
    sceneNote: { createMany: vi.fn() },
    plotLine: { createMany: vi.fn() },
    plotPoint: { createMany: vi.fn() },
    character: { createMany: vi.fn() },
    characterNote: { createMany: vi.fn() },
    place: { create: vi.fn().mockResolvedValue({ id: "pl1" }) },
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
    const nodes = tx.manuscriptNode.createMany.mock.calls[0][0].data as {
      id: string;
      parentId: string | null;
      type: string;
      projectId: string;
    }[];
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

  it("seeds notes on scenes of the project", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const nodes = tx.manuscriptNode.createMany.mock.calls[0][0].data as { id: string; type: string }[];
    const notes = tx.sceneNote.createMany.mock.calls[0][0].data as { sceneId: string; content: string }[];
    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) expect(nodes.find((n) => n.id === note.sceneId)?.type).toBe("SCENE");
  });

  it("seeds plot lines in order, with points on scenes of the project and never two on one cell", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const nodes = tx.manuscriptNode.createMany.mock.calls[0][0].data as { id: string; type: string }[];
    const lines = tx.plotLine.createMany.mock.calls[0][0].data as { id: string; projectId: string; position: number }[];
    const points = tx.plotPoint.createMany.mock.calls[0][0].data as { plotLineId: string; sceneId: string; text: string }[];

    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.map((l) => l.position)).toEqual(lines.map((_, i) => i));
    for (const line of lines) expect(line.projectId).toBe("p1");

    expect(points.length).toBeGreaterThan(0);
    for (const point of points) {
      expect(lines.some((l) => l.id === point.plotLineId)).toBe(true);
      expect(nodes.find((n) => n.id === point.sceneId)?.type).toBe("SCENE");
      expect(point.text).toBeTruthy();
    }
    const cells = points.map((p) => `${p.plotLineId}:${p.sceneId}`);
    expect(new Set(cells).size).toBe(cells.length);
    expect(new Set(points.map((p) => p.sceneId)).size).toBeGreaterThan(2);
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

  it("seeds places in the project, linked only to the seeded characters, with blank fields stored as null", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const characters = tx.character.createMany.mock.calls[0][0].data as { id: string }[];
    const places = tx.place.create.mock.calls.map((call) => call[0].data) as {
      projectId: string;
      smell: string | null;
      relatedCharacters: { connect: { id: string }[] };
    }[];

    expect(places.length).toBeGreaterThanOrEqual(2);
    expect(places.some((p) => p.smell === null)).toBe(true);
    for (const place of places) {
      expect(place.projectId).toBe("p1");
      expect(place.relatedCharacters.connect.length).toBeGreaterThan(0);
      for (const { id } of place.relatedCharacters.connect) expect(characters.some((c) => c.id === id)).toBe(true);
    }
  });
});
