import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { createLabel, deleteLabel, recolorLabel, renameLabel, setNodeLabel } from "@/actions/labels";
import { DUPLICATE_LABEL, MAX_LABELS } from "@/lib/label-config";

beforeEach(() => {
  vi.resetAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const duplicate = () => Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

describe("createLabel", () => {
  const input = { projectId: "p1", name: "  Draft ", color: "#CA8A04", id: "client-id-1" };

  it("rejects signed-out callers, a blank name and a bad color", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await createLabel(input)).success).toBe(false);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    expect((await createLabel({ ...input, name: " " })).success).toBe(false);
    expect((await createLabel({ ...input, color: "gold" })).success).toBe(false);
    expect(prismaMock.label.create).not.toHaveBeenCalled();
  });

  it("adds a trimmed label with a case-folded key and a lower-case color, and expires the labels", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "p1", _count: { labels: 3 } });
    prismaMock.label.create.mockResolvedValue({ id: "client-id-1" });

    expect(await createLabel(input)).toEqual({ success: true, data: { id: "client-id-1" } });
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "user-1" } }));
    expect(prismaMock.label.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: { id: "client-id-1", projectId: "p1", name: "Draft", nameKey: "draft", color: "#ca8a04" } }),
    );
    expect(updateTag).toHaveBeenCalledWith("labels:p1");
  });

  it("refuses a project that is not the owner's, and a twenty-first label", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect((await createLabel(input)).success).toBe(false);
    prismaMock.project.findFirst.mockResolvedValue({ id: "p1", _count: { labels: MAX_LABELS } });
    expect((await createLabel(input)).success).toBe(false);
    expect(prismaMock.label.create).not.toHaveBeenCalled();
  });

  it("reports a duplicate name, ignoring case, as such", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "p1", _count: { labels: 1 } });
    prismaMock.label.create.mockRejectedValue(duplicate());
    expect(await createLabel(input)).toEqual({ success: false, error: DUPLICATE_LABEL });
  });
});

describe("renameLabel and recolorLabel", () => {
  it("touch only a label of the owner's own project", async () => {
    prismaMock.label.updateMany.mockResolvedValue({ count: 1 });
    expect((await renameLabel({ projectId: "p1", labelId: "l1", name: " Final " })).success).toBe(true);
    expect(prismaMock.label.updateMany).toHaveBeenCalledWith({
      where: { id: "l1", projectId: "p1", project: { userId: "user-1" } },
      data: { name: "Final", nameKey: "final" },
    });

    expect((await recolorLabel({ projectId: "p1", labelId: "l1", color: "#16A34A" })).success).toBe(true);
    expect(prismaMock.label.updateMany).toHaveBeenLastCalledWith({
      where: { id: "l1", projectId: "p1", project: { userId: "user-1" } },
      data: { color: "#16a34a" },
    });
  });

  it("report a missing label, a duplicate name and a bad color", async () => {
    prismaMock.label.updateMany.mockResolvedValue({ count: 0 });
    expect((await renameLabel({ projectId: "p1", labelId: "x", name: "A" })).success).toBe(false);
    prismaMock.label.updateMany.mockRejectedValue(duplicate());
    expect(await renameLabel({ projectId: "p1", labelId: "l1", name: "Final" })).toEqual({ success: false, error: DUPLICATE_LABEL });
    expect((await recolorLabel({ projectId: "p1", labelId: "l1", color: "red" })).success).toBe(false);
  });
});

describe("deleteLabel", () => {
  it("deletes a label of the owner's own project and expires what showed it", async () => {
    prismaMock.label.deleteMany.mockResolvedValue({ count: 1 });
    expect((await deleteLabel({ projectId: "p1", labelId: "l1" })).success).toBe(true);
    expect(prismaMock.label.deleteMany).toHaveBeenCalledWith({ where: { id: "l1", projectId: "p1", project: { userId: "user-1" } } });
    for (const tag of ["labels:p1", "manuscript:p1", "plot:p1"]) expect(updateTag).toHaveBeenCalledWith(tag);
  });

  it("never deletes another user's label", async () => {
    prismaMock.label.deleteMany.mockResolvedValue({ count: 0 });
    expect((await deleteLabel({ projectId: "p1", labelId: "theirs" })).success).toBe(false);
  });
});

describe("setNodeLabel", () => {
  it("applies a label of the same project to a live node", async () => {
    prismaMock.label.findFirst.mockResolvedValue({ id: "l1" });
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 1 });

    expect((await setNodeLabel({ projectId: "p1", nodeId: "s1", labelId: "l1" })).success).toBe(true);
    expect(prismaMock.label.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "l1", projectId: "p1", project: { userId: "user-1" } } }),
    );
    expect(prismaMock.manuscriptNode.updateMany).toHaveBeenCalledWith({
      where: { id: "s1", projectId: "p1", trashedAt: null, project: { userId: "user-1" } },
      data: { labelId: "l1" },
    });
  });

  it("removes a label with null, without looking one up", async () => {
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 1 });
    expect((await setNodeLabel({ projectId: "p1", nodeId: "s1", labelId: null })).success).toBe(true);
    expect(prismaMock.label.findFirst).not.toHaveBeenCalled();
  });

  it("refuses a label of another project or user, and a node that is missing", async () => {
    prismaMock.label.findFirst.mockResolvedValue(null);
    expect((await setNodeLabel({ projectId: "p1", nodeId: "s1", labelId: "theirs" })).success).toBe(false);
    expect(prismaMock.manuscriptNode.updateMany).not.toHaveBeenCalled();

    prismaMock.label.findFirst.mockResolvedValue({ id: "l1" });
    prismaMock.manuscriptNode.updateMany.mockResolvedValue({ count: 0 });
    expect((await setNodeLabel({ projectId: "p1", nodeId: "gone", labelId: "l1" })).success).toBe(false);
  });
});
