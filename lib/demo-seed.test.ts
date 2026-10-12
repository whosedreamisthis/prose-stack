import { describe, it, expect, vi } from "vitest";
import "@/test/mock-prisma";
import { seedDemoProject } from "@/lib/demo-seed";
import { STARTER_FOLDERS } from "@/lib/research-config";

function fakeTx() {
  return {
    project: { create: vi.fn().mockResolvedValue({ id: "p1" }) },
    manuscriptNode: { createMany: vi.fn() },
    label: { createMany: vi.fn() },
    sceneNote: { createMany: vi.fn() },
    projectNote: { createMany: vi.fn() },
    plotLine: { createMany: vi.fn() },
    plotPoint: { createMany: vi.fn() },
    character: { createMany: vi.fn() },
    characterNote: { createMany: vi.fn() },
    place: { create: vi.fn().mockResolvedValue({ id: "pl1" }) },
    researchFolder: { createMany: vi.fn() },
    researchItem: { createMany: vi.fn() },
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
    // Notes are kept on scenes, and also on a part and a chapter.
    for (const note of notes) expect(["SCENE", "PART", "CHAPTER"]).toContain(nodes.find((n) => n.id === note.sceneId)?.type);
    expect(notes.some((n) => nodes.find((x) => x.id === n.sceneId)?.type === "SCENE")).toBe(true);
  });

  it("seeds notes on the book, a part and a chapter as well as on scenes", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const nodes = tx.manuscriptNode.createMany.mock.calls[0][0].data as { id: string; type: string }[];
    const notes = tx.sceneNote.createMany.mock.calls[0][0].data as { sceneId: string }[];
    const typesWithNotes = new Set(notes.map((n) => nodes.find((x) => x.id === n.sceneId)?.type));
    expect(typesWithNotes).toEqual(new Set(["SCENE", "PART", "CHAPTER"]));

    const bookNotes = tx.projectNote.createMany.mock.calls[0][0].data as { projectId: string; content: string }[];
    expect(bookNotes.length).toBeGreaterThan(0);
    for (const note of bookNotes) {
      expect(note.projectId).toBe("p1");
      expect(note.content).toBeTruthy();
    }
  });

  it("seeds labels and applies them to the outline and to plot points, all of this project", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const labels = tx.label.createMany.mock.calls[0][0].data as { id: string; projectId: string; name: string; nameKey: string; color: string }[];
    expect(labels.map((l) => l.name)).toEqual(["Draft", "Revise", "Final"]);
    for (const label of labels) {
      expect(label.projectId).toBe("p1");
      expect(label.nameKey).toBe(label.name.toLowerCase());
      expect(label.color).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(new Set(labels.map((l) => l.color)).size).toBe(labels.length);

    const ids = new Set(labels.map((l) => l.id));
    const nodes = tx.manuscriptNode.createMany.mock.calls[0][0].data as { type: string; labelId?: string }[];
    const labelled = nodes.filter((n) => n.labelId);
    expect(new Set(labelled.map((n) => n.type))).toEqual(new Set(["PART", "CHAPTER", "SCENE"]));
    for (const node of labelled) expect(ids.has(node.labelId!)).toBe(true);

    const points = tx.plotPoint.createMany.mock.calls[0][0].data as { labelId?: string }[];
    expect(points.some((p) => p.labelId)).toBe(true);
    for (const point of points.filter((p) => p.labelId)) expect(ids.has(point.labelId!)).toBe(true);
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

  it("seeds research: the starter folders, with notes and a link inside them, two linked to the story", async () => {
    const tx = fakeTx();
    await seedDemoProject(tx as never, "u1");
    const folders = tx.researchFolder.createMany.mock.calls[0][0].data as { id: string; projectId: string; name: string }[];
    const items = tx.researchItem.createMany.mock.calls[0][0].data as {
      projectId: string;
      folderId: string | null;
      type: string;
      url?: string;
      characterId?: string;
      placeId?: string;
    }[];
    expect(folders.map((f) => f.name)).toEqual([...STARTER_FOLDERS]);
    for (const row of [...folders, ...items]) expect(row.projectId).toBe("p1");
    for (const item of items) if (item.folderId) expect(folders.some((f) => f.id === item.folderId)).toBe(true);
    expect(items.some((i) => i.type === "LINK" && i.url?.startsWith("https://"))).toBe(true);
    expect(items.some((i) => i.characterId)).toBe(true);
    expect(items.some((i) => i.placeId === "pl1")).toBe(true);
  });
});
