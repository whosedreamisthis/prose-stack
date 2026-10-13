import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { addProofreadIgnore, listProofreadIgnores, removeProofreadIgnore } from "@/actions/proofread";
import { IGNORE_LIMIT } from "@/lib/proofread/config";

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.project.findFirst.mockResolvedValue({ id: "p1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("addProofreadIgnore", () => {
  it("rejects signed-out callers and other people's projects", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await addProofreadIgnore({ projectId: "p1", kind: "WORD", value: "really" })).success).toBe(false);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect((await addProofreadIgnore({ projectId: "p1", kind: "WORD", value: "really" })).success).toBe(false);
    expect(prismaMock.proofreadIgnore.create).not.toHaveBeenCalled();
  });

  it("stores a lower-cased entry", async () => {
    prismaMock.proofreadIgnore.findUnique.mockResolvedValue(null);
    prismaMock.proofreadIgnore.count.mockResolvedValue(0);
    const result = await addProofreadIgnore({ projectId: "p1", kind: "WORD", value: "Really" });
    expect(result.success).toBe(true);
    expect(prismaMock.proofreadIgnore.create).toHaveBeenCalledWith({ data: { projectId: "p1", kind: "WORD", value: "really" } });
  });

  it("treats adding something already there as success, without a second row", async () => {
    prismaMock.proofreadIgnore.findUnique.mockResolvedValue({ id: "i1" });
    expect((await addProofreadIgnore({ projectId: "p1", kind: "RULE", value: "passive" })).success).toBe(true);
    expect(prismaMock.proofreadIgnore.create).not.toHaveBeenCalled();
  });

  it("refuses a full list and invalid input", async () => {
    prismaMock.proofreadIgnore.findUnique.mockResolvedValue(null);
    prismaMock.proofreadIgnore.count.mockResolvedValue(IGNORE_LIMIT);
    expect((await addProofreadIgnore({ projectId: "p1", kind: "WORD", value: "x" })).success).toBe(false);
    expect((await addProofreadIgnore({ projectId: "p1", kind: "WORD", value: "   " })).success).toBe(false);
    expect((await addProofreadIgnore({ projectId: "p1", kind: "OTHER" as "WORD", value: "x" })).success).toBe(false);
  });

  it("returns a retryable error when the database fails", async () => {
    prismaMock.proofreadIgnore.findUnique.mockRejectedValue(new Error("db down"));
    expect((await addProofreadIgnore({ projectId: "p1", kind: "WORD", value: "x" })).success).toBe(false);
  });
});

describe("listProofreadIgnores and removeProofreadIgnore", () => {
  it("lists the project's entries, scoped to the owner", async () => {
    prismaMock.proofreadIgnore.findMany.mockResolvedValue([{ id: "i1", kind: "WORD", value: "really" }]);
    const result = await listProofreadIgnores("p1");
    expect(result).toEqual({ success: true, data: [{ id: "i1", kind: "WORD", value: "really" }] });
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "user-1" } }));
  });

  it("removes an entry only within the owner's project", async () => {
    expect((await removeProofreadIgnore({ projectId: "p1", id: "i1" })).success).toBe(true);
    expect(prismaMock.proofreadIgnore.deleteMany).toHaveBeenCalledWith({ where: { id: "i1", projectId: "p1" } });
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect((await removeProofreadIgnore({ projectId: "p1", id: "i1" })).success).toBe(false);
  });
});
