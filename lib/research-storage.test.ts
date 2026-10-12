import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const deleteFilesMock = vi.fn();
vi.mock("uploadthing/server", () => ({
  UTApi: class {
    deleteFiles = deleteFilesMock;
  },
}));

import { deleteStoredFiles, researchFileKeys } from "@/lib/research-storage";

beforeEach(() => {
  deleteFilesMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("deleteStoredFiles", () => {
  it("deletes the keys that exist, and skips empty ones", async () => {
    await deleteStoredFiles(["a", null, "b", undefined]);
    expect(deleteFilesMock).toHaveBeenCalledWith(["a", "b"]);
  });

  it("does not call UploadThing when there is nothing to delete", async () => {
    await deleteStoredFiles([null]);
    expect(deleteFilesMock).not.toHaveBeenCalled();
  });

  it("logs and carries on when the storage delete fails", async () => {
    deleteFilesMock.mockRejectedValue(new Error("down"));
    await expect(deleteStoredFiles(["a"])).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("researchFileKeys", () => {
  it("lists the keys of matching uploads only", async () => {
    prismaMock.researchItem.findMany.mockResolvedValue([{ fileKey: "a" }, { fileKey: null }, { fileKey: "b" }]);
    expect(await researchFileKeys({ projectId: "p1" })).toEqual(["a", "b"]);
    expect(prismaMock.researchItem.findMany).toHaveBeenCalledWith({
      where: { projectId: "p1", fileKey: { not: null } },
      select: { fileKey: true },
    });
  });
});
