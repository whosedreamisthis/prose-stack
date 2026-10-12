import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const getProject = vi.fn();
const getCharacter = vi.fn();
const listCharacterNotes = vi.fn();
const listCharacters = vi.fn();
const getPlace = vi.fn();
const listPlaceNotes = vi.fn();
const getManuscript = vi.fn();
const getScene = vi.fn();
const getBookNodes = vi.fn();
vi.mock("@/lib/projects", () => ({ getProject: (...a: unknown[]) => getProject(...a) }));
vi.mock("@/lib/characters", () => ({
  getCharacter: (...a: unknown[]) => getCharacter(...a),
  listCharacterNotes: (...a: unknown[]) => listCharacterNotes(...a),
  listCharacters: (...a: unknown[]) => listCharacters(...a),
}));
vi.mock("@/lib/places", () => ({ getPlace: (...a: unknown[]) => getPlace(...a), listPlaceNotes: (...a: unknown[]) => listPlaceNotes(...a) }));
vi.mock("@/lib/manuscript", () => ({ getManuscript: (...a: unknown[]) => getManuscript(...a), getScene: (...a: unknown[]) => getScene(...a),
  getBookNodes: (...a: unknown[]) => getBookNodes(...a),
}));
const renderManuscript = vi.fn();
vi.mock("@/lib/pdf/manuscript", () => ({ renderManuscriptPdf: (...a: unknown[]) => renderManuscript(...a) }));

const renderBook = vi.fn();
vi.mock("@/lib/pdf/book", () => ({ renderBookPdf: (...a: unknown[]) => renderBook(...a) }));

import { buildExport } from "@/lib/export";

const project = { id: "p1", title: "Book", fontFamily: "Georgia", fontSize: 12, lineSpacing: "DOUBLE" };
const node = (id: string, type: string, parentId: string | null, position: number, title = id) => ({
  id,
  type,
  parentId,
  position,
  title,
  wordCount: 0,
});

beforeEach(() => {
  getProject.mockResolvedValue(project);
  renderManuscript.mockResolvedValue(Buffer.from("%PDF-"));
});

describe("buildExport", () => {
  it("exports the whole book, named after the project, from its live nodes", async () => {
    getProject.mockResolvedValue({ ...project, subtitle: null, author: "A. Writer" });
    getBookNodes.mockResolvedValue([node("c1", "CHAPTER", null, 0, "One"), { ...node("s1", "SCENE", "c1", 0), content: null }]);
    renderBook.mockResolvedValue(Buffer.from("%PDF-"));
    const result = await buildExport("u1", "book", "p1", "p1");
    expect(result?.name).toBe("Book");
    expect(renderBook).toHaveBeenCalledWith(
      { title: "Book", subtitle: "", author: "A. Writer" },
      [{ kind: "chapter", title: "One", scenes: [null] }],
      { fontFamily: "Georgia", fontSize: 12, lineSpacing: "DOUBLE" },
    );
  });

  it("is null for a book export of a project that is not the user's", async () => {
    getProject.mockResolvedValue(null);
    expect(await buildExport("u1", "book", "p1", "p1")).toBeNull();
  });

  it("is null when the project is not the user's", async () => {
    getProject.mockResolvedValue(null);
    expect(await buildExport("u1", "character", "c1", "p1")).toBeNull();
  });

  it("exports a character with no filled fields", async () => {
    getCharacter.mockResolvedValue({ id: "c1", name: "Mara", role: "MAIN", age: "", location: "", roleInStory: "", goal: "", physicalDescription: "", personality: "", occupation: "", habits: "", background: "", internalConflicts: "", externalConflicts: "" });
    listCharacterNotes.mockResolvedValue([]);
    const result = await buildExport("u1", "character", "c1", "p1");
    expect(result?.name).toBe("Mara");
    expect(result?.pdf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("is null for a trashed or archived character or place", async () => {
    getCharacter.mockResolvedValue(null);
    listCharacterNotes.mockResolvedValue([]);
    expect(await buildExport("u1", "character", "c1", "p1")).toBeNull();
    getPlace.mockResolvedValue(null);
    listPlaceNotes.mockResolvedValue([]);
    listCharacters.mockResolvedValue([]);
    expect(await buildExport("u1", "place", "x", "p1")).toBeNull();
  });

  it("lists only live related characters of a place", async () => {
    getPlace.mockResolvedValue({ id: "pl", name: "Lighthouse", location: "", roleInStory: "", season: "", uniqueFeatures: "", description: "Tall", sights: "", sounds: "", smell: "", relatedCharacterIds: ["c1", "trashed"] });
    listPlaceNotes.mockResolvedValue([]);
    listCharacters.mockResolvedValue([{ id: "c1", name: "Mara", role: "MAIN" }]);
    const result = await buildExport("u1", "place", "pl", "p1");
    expect(result?.name).toBe("Lighthouse");
  });

  it("is null for a trashed node (not in the live outline)", async () => {
    getManuscript.mockResolvedValue([node("a", "CHAPTER", null, 0)]);
    expect(await buildExport("u1", "node", "gone", "p1")).toBeNull();
  });

  it("exports a part as titles and scenes in tree order, without trashed scenes", async () => {
    getManuscript.mockResolvedValue([
      node("part", "PART", null, 0, "Part One"),
      node("ch2", "CHAPTER", "part", 1, "Chapter 2"),
      node("ch1", "CHAPTER", "part", 0, "Chapter 1"),
      node("s2", "SCENE", "ch1", 1),
      node("s1", "SCENE", "ch1", 0),
      node("s3", "SCENE", "ch2", 0),
    ]);
    prismaMock.manuscriptNode.findMany.mockResolvedValue([
      { id: "s1", content: "one" },
      { id: "s2", content: "two" },
      { id: "s3", content: "three" },
    ]);
    await buildExport("u1", "node", "part", "p1");
    const sections = renderManuscript.mock.calls[0][1];
    expect(sections).toEqual([
      { kind: "title", text: "Part One", level: 1 },
      { kind: "title", text: "Chapter 1", level: 2 },
      { kind: "scene", doc: "one" },
      { kind: "scene", doc: "two" },
      { kind: "title", text: "Chapter 2", level: 2 },
      { kind: "scene", doc: "three" },
    ]);
    expect(prismaMock.manuscriptNode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ trashedAt: null, project: { userId: "u1" } }) }),
    );
  });

  it("exports a scene as its text only", async () => {
    getManuscript.mockResolvedValue([node("s1", "SCENE", null, 0, "Scene 1")]);
    getScene.mockResolvedValue({ id: "s1", content: "doc" });
    await buildExport("u1", "node", "s1", "p1");
    expect(renderManuscript.mock.calls[0][1]).toEqual([{ kind: "scene", doc: "doc" }]);
  });
});
