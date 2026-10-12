import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import {
  addScene,
  createPlotLine,
  createPlotPoint,
  renamePlotLine,
  reorderPlotLines,
  trashPlotLine,
  trashPlotPoint,
  updatePlotPoint,
} from "@/actions/plot";
import { CELL_TAKEN, MAX_PLOT_LINES } from "@/lib/plot-config";

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
  prismaMock.$queryRaw.mockResolvedValue([{ id: "p1" }]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createPlotLine", () => {
  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await createPlotLine({ projectId: "p1" })).success).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("adds a numbered line at the end and expires the plot", async () => {
    prismaMock.plotLine.count.mockResolvedValue(2);
    prismaMock.plotLine.create.mockResolvedValue({ id: "l3" });

    const result = await createPlotLine({ projectId: "p1", id: "client-id-1" });

    expect(result).toEqual({ success: true, data: { id: "l3" } });
    expect(prismaMock.plotLine.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: "client-id-1", projectId: "p1", name: "Plot line 3", position: 2 } }),
    );
    expect(updateTag).toHaveBeenCalledWith("plot:p1");
  });

  it("refuses a line past the limit", async () => {
    prismaMock.plotLine.count.mockResolvedValue(MAX_PLOT_LINES);
    expect((await createPlotLine({ projectId: "p1" })).success).toBe(false);
    expect(prismaMock.plotLine.create).not.toHaveBeenCalled();
  });

  it("is not found when the project is not the user's", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    expect((await createPlotLine({ projectId: "other" })).success).toBe(false);
    expect(prismaMock.plotLine.create).not.toHaveBeenCalled();
  });
});

describe("renamePlotLine", () => {
  it("renames only the user's live line", async () => {
    prismaMock.plotLine.updateMany.mockResolvedValue({ count: 1 });
    expect((await renamePlotLine({ projectId: "p1", plotLineId: "l1", name: "  Romance " })).success).toBe(true);
    expect(prismaMock.plotLine.updateMany).toHaveBeenCalledWith({
      where: { id: "l1", projectId: "p1", project: { userId: "user-1" }, trashedAt: null },
      data: { name: "Romance" },
    });
  });

  it("rejects a blank name and a missing line", async () => {
    expect((await renamePlotLine({ projectId: "p1", plotLineId: "l1", name: "  " })).success).toBe(false);
    prismaMock.plotLine.updateMany.mockResolvedValue({ count: 0 });
    expect((await renamePlotLine({ projectId: "p1", plotLineId: "x", name: "A" })).success).toBe(false);
  });
});

describe("reorderPlotLines", () => {
  it("saves the order in one transaction", async () => {
    prismaMock.plotLine.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }, { id: "c" }]);

    expect((await reorderPlotLines({ projectId: "p1", orderedIds: ["c", "a", "b"] })).success).toBe(true);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.plotLine.update).toHaveBeenCalledWith({ where: { id: "c" }, data: { position: 0 } });
    expect(prismaMock.plotLine.update).toHaveBeenCalledWith({ where: { id: "a" }, data: { position: 1 } });
    expect(prismaMock.plotLine.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { position: 2 } });
  });

  it("refuses a list that is not exactly the live lines", async () => {
    prismaMock.plotLine.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    expect((await reorderPlotLines({ projectId: "p1", orderedIds: ["a"] })).success).toBe(false);
    expect((await reorderPlotLines({ projectId: "p1", orderedIds: ["a", "a"] })).success).toBe(false);
    expect((await reorderPlotLines({ projectId: "p1", orderedIds: ["a", "z"] })).success).toBe(false);
    expect(prismaMock.plotLine.update).not.toHaveBeenCalled();
  });
});

describe("trashPlotLine", () => {
  it("trashes the line, renumbers the rest and expires the trash", async () => {
    prismaMock.plotLine.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.plotLine.findMany.mockResolvedValue([
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ]);

    expect((await trashPlotLine({ projectId: "p1", plotLineId: "a" })).success).toBe(true);

    expect(prismaMock.plotLine.update).toHaveBeenCalledWith({ where: { id: "b" }, data: { position: 0 } });
    expect(prismaMock.plotLine.update).toHaveBeenCalledWith({ where: { id: "c" }, data: { position: 1 } });
    expect(updateTag).toHaveBeenCalledWith("trash:p1");
  });

  it("is not found when the line is already trashed or not the user's", async () => {
    prismaMock.plotLine.updateMany.mockResolvedValue({ count: 0 });
    expect((await trashPlotLine({ projectId: "p1", plotLineId: "x" })).success).toBe(false);
  });
});

describe("createPlotPoint", () => {
  const live = { id: "l1" };

  it("adds a point to a live scene on a live line", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue(live);
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.plotPoint.findFirst.mockResolvedValue(null);
    prismaMock.plotPoint.create.mockResolvedValue({ id: "pt1" });

    const result = await createPlotPoint({ projectId: "p1", plotLineId: "l1", sceneId: "s1", title: "Hook", text: "She arrives" });

    expect(result).toEqual({ success: true, data: { id: "pt1", sceneId: "s1" } });
    expect(prismaMock.plotPoint.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { plotLineId: "l1", sceneId: "s1", title: "Hook", text: "She arrives" } }),
    );
    expect(updateTag).not.toHaveBeenCalledWith("manuscript:p1");
  });

  it("refuses a second point on the same plot line in a scene", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue(live);
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.plotPoint.findFirst.mockResolvedValue({ id: "old", trashedAt: null });

    expect(await createPlotPoint({ projectId: "p1", plotLineId: "l1", sceneId: "s1", text: "Again" })).toEqual({
      success: false,
      error: CELL_TAKEN,
    });
    expect(prismaMock.plotPoint.create).not.toHaveBeenCalled();
  });

  it("replaces a trashed point in the way for good", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue(live);
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.plotPoint.findFirst.mockResolvedValue({ id: "old", trashedAt: new Date() });
    prismaMock.plotPoint.create.mockResolvedValue({ id: "pt2" });

    expect((await createPlotPoint({ projectId: "p1", plotLineId: "l1", sceneId: "s1", text: "New" })).success).toBe(true);
    expect(prismaMock.plotPoint.delete).toHaveBeenCalledWith({ where: { id: "old" } });
  });

  it("adds the scene to the end of the last chapter when no scene is given", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue(live);
    prismaMock.manuscriptNode.findMany.mockResolvedValue([
      { id: "c1", parentId: null, type: "CHAPTER", title: "Chapter 1", position: 0 },
      { id: "s1", parentId: "c1", type: "SCENE", title: "Scene 1", position: 0 },
    ]);
    prismaMock.manuscriptNode.create.mockResolvedValue({ id: "newscene1" });
    prismaMock.plotPoint.create.mockResolvedValue({ id: "pt1" });

    const result = await createPlotPoint({ projectId: "p1", plotLineId: "l1", newSceneId: "newscene1", text: "Plan ahead" });

    expect(result).toEqual({ success: true, data: { id: "pt1", sceneId: "newscene1" } });
    expect(prismaMock.manuscriptNode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { id: "newscene1", projectId: "p1", parentId: "c1", type: "SCENE", title: "Scene 2", position: 1 },
      }),
    );
    expect(updateTag).toHaveBeenCalledWith("manuscript:p1");
  });

  it("creates Chapter 1 when the manuscript has none", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue(live);
    prismaMock.manuscriptNode.findMany.mockResolvedValue([]);
    prismaMock.manuscriptNode.create.mockResolvedValueOnce({ id: "ch1" }).mockResolvedValueOnce({ id: "sc1" });
    prismaMock.plotPoint.create.mockResolvedValue({ id: "pt1" });

    expect((await createPlotPoint({ projectId: "p1", plotLineId: "l1", text: "First" })).success).toBe(true);
    expect(prismaMock.manuscriptNode.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ data: expect.objectContaining({ type: "CHAPTER", title: "Chapter 1" }) }),
    );
    expect(prismaMock.manuscriptNode.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ data: expect.objectContaining({ parentId: "ch1", type: "SCENE" }) }),
    );
  });

  it("never creates a point without a scene: a scene that is missing or trashed is refused", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue(live);
    prismaMock.manuscriptNode.findFirst.mockResolvedValue(null);
    expect((await createPlotPoint({ projectId: "p1", plotLineId: "l1", sceneId: "gone", text: "x" })).success).toBe(false);
    expect(prismaMock.plotPoint.create).not.toHaveBeenCalled();
  });

  it("refuses a point on a line that is not the user's or is trashed", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue(null);
    expect((await createPlotPoint({ projectId: "p1", plotLineId: "x", sceneId: "s1", text: "x" })).success).toBe(false);
    expect(prismaMock.plotPoint.create).not.toHaveBeenCalled();
  });

  it("rejects an empty point and a point with both a scene and a new scene", async () => {
    expect((await createPlotPoint({ projectId: "p1", plotLineId: "l1", sceneId: "s1", text: "  ", title: " " })).success).toBe(false);
    expect(
      (await createPlotPoint({ projectId: "p1", plotLineId: "l1", sceneId: "s1", newSceneId: "newscene1", text: "x" })).success,
    ).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});

describe("updatePlotPoint", () => {
  const point = { plotLineId: "l1", sceneId: "s1", title: "Hook", text: "She arrives" };

  beforeEach(() => {
    prismaMock.plotPoint.findFirst.mockResolvedValueOnce(point);
  });

  it("saves new text without checking any cell", async () => {
    expect((await updatePlotPoint({ projectId: "p1", pointId: "pt1", text: "She leaves" })).success).toBe(true);
    expect(prismaMock.plotPoint.update).toHaveBeenCalledWith({
      where: { id: "pt1" },
      data: { text: "She leaves", plotLineId: "l1", sceneId: "s1" },
    });
    expect(prismaMock.plotPoint.findFirst).toHaveBeenCalledTimes(1);
  });

  it("moves a point to a free cell of another scene", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue({ id: "l1" });
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s2" });
    prismaMock.plotPoint.findFirst.mockResolvedValueOnce(null);

    expect((await updatePlotPoint({ projectId: "p1", pointId: "pt1", sceneId: "s2" })).success).toBe(true);
    expect(prismaMock.plotPoint.update).toHaveBeenCalledWith({ where: { id: "pt1" }, data: { plotLineId: "l1", sceneId: "s2" } });
  });

  it("refuses a move onto a cell that already has a point", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue({ id: "l2" });
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s1" });
    prismaMock.plotPoint.findFirst.mockResolvedValueOnce({ id: "other", trashedAt: null });

    expect(await updatePlotPoint({ projectId: "p1", pointId: "pt1", plotLineId: "l2" })).toEqual({ success: false, error: CELL_TAKEN });
    expect(prismaMock.plotPoint.update).not.toHaveBeenCalled();
  });

  it("refuses a move to a scene that is missing or trashed, so a point is never left without one", async () => {
    prismaMock.plotLine.findFirst.mockResolvedValue({ id: "l1" });
    prismaMock.manuscriptNode.findFirst.mockResolvedValue(null);
    expect((await updatePlotPoint({ projectId: "p1", pointId: "pt1", sceneId: "gone" })).success).toBe(false);
    expect(prismaMock.plotPoint.update).not.toHaveBeenCalled();
  });

  it("refuses to blank the title and the text together", async () => {
    expect((await updatePlotPoint({ projectId: "p1", pointId: "pt1", title: "", text: "" })).success).toBe(false);
  });
});

describe("updatePlotPoint on a missing point", () => {
  it("is not found", async () => {
    prismaMock.plotPoint.findFirst.mockResolvedValue(null);
    expect((await updatePlotPoint({ projectId: "p1", pointId: "nope", text: "x" })).success).toBe(false);
    expect(prismaMock.plotPoint.update).not.toHaveBeenCalled();
  });
});

describe("trashPlotPoint", () => {
  it("trashes only a live point of the user's project and expires the trash", async () => {
    prismaMock.plotPoint.updateMany.mockResolvedValue({ count: 1 });
    expect((await trashPlotPoint({ projectId: "p1", pointId: "pt1" })).success).toBe(true);
    expect(prismaMock.plotPoint.updateMany).toHaveBeenCalledWith({
      where: { id: "pt1", trashedAt: null, plotLine: { projectId: "p1", project: { userId: "user-1" } } },
      data: { trashedAt: expect.any(Date) },
    });
    expect(updateTag).toHaveBeenCalledWith("trash:p1");
  });

  it("is not found for someone else's point", async () => {
    prismaMock.plotPoint.updateMany.mockResolvedValue({ count: 0 });
    expect((await trashPlotPoint({ projectId: "p1", pointId: "x" })).success).toBe(false);
  });
});

describe("addScene", () => {
  it("adds a scene at the end of the manuscript and expires the outline", async () => {
    prismaMock.manuscriptNode.findMany.mockResolvedValue([{ id: "c1", parentId: null, type: "CHAPTER", title: "Chapter 1", position: 0 }]);
    prismaMock.manuscriptNode.create.mockResolvedValue({ id: "newscene1" });

    expect(await addScene({ projectId: "p1", id: "newscene1" })).toEqual({ success: true, data: { id: "newscene1" } });
    expect(updateTag).toHaveBeenCalledWith("manuscript:p1");
  });
});
