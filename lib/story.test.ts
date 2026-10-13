import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { getStructure, pruneBeatProgress } from "@/lib/story";

beforeEach(() => vi.resetAllMocks());

describe("getStructure", () => {
  it("is empty when the project is not the user's or has no template, without reading progress", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect(await getStructure("u1", "p1")).toEqual({ templateId: null, progress: {} });
    prismaMock.project.findFirst.mockResolvedValue({ storyTemplateId: null });
    expect(await getStructure("u1", "p1")).toEqual({ templateId: null, progress: {} });
    expect(prismaMock.beatProgress.findMany).not.toHaveBeenCalled();
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "u1" } }));
  });

  it("returns progress by beat key with live scenes in outline order, skipping beats the template lacks", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ storyTemplateId: "romance" });
    prismaMock.beatProgress.findMany.mockResolvedValue([
      {
        beatKey: "meet",
        covered: true,
        scenes: [
          { id: "s2", title: "Second", position: 1 },
          { id: "s1", title: "First", position: 0 },
        ],
      },
      { beatKey: "midpoint", covered: true, scenes: [] },
    ]);
    expect(await getStructure("u1", "p1")).toEqual({
      templateId: "romance",
      progress: {
        meet: {
          covered: true,
          scenes: [
            { id: "s1", title: "First" },
            { id: "s2", title: "Second" },
          ],
        },
      },
    });
    expect(prismaMock.beatProgress.findMany.mock.calls[0][0].select.scenes.where).toEqual({ trashedAt: null });
  });
});

describe("pruneBeatProgress", () => {
  it("deletes the project's progress on beats outside the new template", async () => {
    await pruneBeatProgress(prismaMock as never, "p1", "romance");
    expect(prismaMock.beatProgress.deleteMany).toHaveBeenCalledWith({
      where: { projectId: "p1", beatKey: { notIn: ["meet", "barrier", "black-moment", "resolution"] } },
    });
  });

  it("deletes all of it when the template is cleared", async () => {
    await pruneBeatProgress(prismaMock as never, "p1", null);
    expect(prismaMock.beatProgress.deleteMany).toHaveBeenCalledWith({ where: { projectId: "p1", beatKey: { notIn: [] } } });
  });
});
