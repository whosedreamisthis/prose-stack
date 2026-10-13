import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { linkBeatScene, toggleBeatCovered, unlinkBeatScene } from "@/actions/story";

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.project.findFirst.mockResolvedValue({ storyTemplateId: "three-act" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const beat = { projectId: "p1", beatKey: "midpoint" };
const link = { ...beat, sceneId: "s1" };

describe("toggleBeatCovered", () => {
  it("rejects signed-out callers and bad input", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await toggleBeatCovered({ ...beat, covered: true })).success).toBe(false);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    expect((await toggleBeatCovered({ ...beat, beatKey: " ", covered: true })).success).toBe(false);
    expect(prismaMock.beatProgress.upsert).not.toHaveBeenCalled();
  });

  it("refuses a beat the project's template lacks, and a project that is not the owner's", async () => {
    expect((await toggleBeatCovered({ ...beat, beatKey: "meet", covered: true })).success).toBe(false);
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect((await toggleBeatCovered({ ...beat, covered: true })).success).toBe(false);
    expect(prismaMock.beatProgress.upsert).not.toHaveBeenCalled();
  });

  it("saves the beat for the owner's project and expires the structure", async () => {
    expect((await toggleBeatCovered({ ...beat, covered: true })).success).toBe(true);
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "user-1" } }));
    expect(prismaMock.beatProgress.upsert).toHaveBeenCalledWith({
      where: { projectId_beatKey: { projectId: "p1", beatKey: "midpoint" } },
      create: { projectId: "p1", beatKey: "midpoint", covered: true },
      update: { covered: true },
    });
    expect(updateTag).toHaveBeenCalledWith("structure:p1");
  });
});

describe("linkBeatScene", () => {
  it("links a live scene of the same project", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue({ id: "s1" });
    expect((await linkBeatScene(link)).success).toBe(true);
    expect(prismaMock.manuscriptNode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: "s1", projectId: "p1", type: "SCENE", trashedAt: null }) }),
    );
    expect(prismaMock.beatProgress.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: { scenes: { connect: { id: "s1" } } } }),
    );
  });

  it("refuses a scene that is missing, trashed or someone else's", async () => {
    prismaMock.manuscriptNode.findFirst.mockResolvedValue(null);
    expect((await linkBeatScene(link)).success).toBe(false);
    expect(prismaMock.beatProgress.upsert).not.toHaveBeenCalled();
  });
});

describe("unlinkBeatScene", () => {
  it("disconnects the scene from an existing beat", async () => {
    prismaMock.beatProgress.findUnique.mockResolvedValue({ id: "b1" });
    expect((await unlinkBeatScene(link)).success).toBe(true);
    expect(prismaMock.beatProgress.update).toHaveBeenCalledWith({ where: { id: "b1" }, data: { scenes: { disconnect: { id: "s1" } } } });
    expect(updateTag).toHaveBeenCalledWith("structure:p1");
  });

  it("does nothing when the beat has no progress yet", async () => {
    prismaMock.beatProgress.findUnique.mockResolvedValue(null);
    expect((await unlinkBeatScene(link)).success).toBe(true);
    expect(prismaMock.beatProgress.update).not.toHaveBeenCalled();
  });
});
