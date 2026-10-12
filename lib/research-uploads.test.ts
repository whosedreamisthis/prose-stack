import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { authorizeUpload, createUploadedItem, storageUsed } from "@/lib/research-uploads";
import { PROJECT_STORAGE_BYTES } from "@/lib/research-config";

const MB = 1024 * 1024;
const image = { name: "map.png", type: "image/png", size: 1 * MB };
const input = { projectId: "p1", folderId: null };

beforeEach(() => {
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  prismaMock.project.findFirst.mockResolvedValue({ id: "p1" });
  prismaMock.researchFolder.findFirst.mockResolvedValue({ id: "f1" });
  prismaMock.researchItem.count.mockResolvedValue(0);
  prismaMock.researchItem.aggregate.mockResolvedValue({ _sum: { fileSize: 0 } });
});

describe("authorizeUpload: ownership", () => {
  it("refuses a signed-out caller before looking anything up", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    await expect(authorizeUpload("IMAGE", input, [image])).rejects.toThrow("You need to be signed in.");
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
  });

  it("refuses a project the user does not own", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    await expect(authorizeUpload("IMAGE", input, [image])).rejects.toThrow("Project not found.");
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith({ where: { id: "p1", userId: "user-1" }, select: { id: true } });
  });

  it("refuses a folder that is missing or hidden", async () => {
    prismaMock.researchFolder.findFirst.mockResolvedValue(null);
    await expect(authorizeUpload("IMAGE", { projectId: "p1", folderId: "f1" }, [image])).rejects.toThrow("Folder not found.");
  });

  it("returns who and where for onUploadComplete", async () => {
    expect(await authorizeUpload("IMAGE", { projectId: "p1", folderId: "f1" }, [image])).toEqual({
      userId: "user-1",
      projectId: "p1",
      folderId: "f1",
    });
  });
});

describe("authorizeUpload: type and size", () => {
  it("refuses a type the kind does not take", async () => {
    await expect(authorizeUpload("IMAGE", input, [{ name: "a.pdf", type: "application/pdf", size: 10 }])).rejects.toThrow(/must be JPEG/);
    await expect(authorizeUpload("FILE", input, [image])).rejects.toThrow(/must be PDF/);
  });

  it("refuses an image over 4 MB and a file over 8 MB", async () => {
    await expect(authorizeUpload("IMAGE", input, [{ ...image, size: 4 * MB + 1 }])).rejects.toThrow(/up to 4 MB/);
    await expect(authorizeUpload("FILE", input, [{ name: "a.pdf", type: "application/pdf", size: 8 * MB + 1 }])).rejects.toThrow(/up to 8 MB/);
  });

  it("takes a file whose browser type is empty by its extension", async () => {
    await expect(authorizeUpload("FILE", input, [{ name: "notes.docx", type: "", size: 10 }])).resolves.toBeTruthy();
  });
});

describe("authorizeUpload: storage cap", () => {
  it("accepts an upload that fits exactly", async () => {
    prismaMock.researchItem.aggregate.mockResolvedValue({ _sum: { fileSize: PROJECT_STORAGE_BYTES - image.size } });
    await expect(authorizeUpload("IMAGE", input, [image])).resolves.toBeTruthy();
  });

  it("refuses an upload past the cap, saying how much is used", async () => {
    prismaMock.researchItem.aggregate.mockResolvedValue({ _sum: { fileSize: PROJECT_STORAGE_BYTES - image.size + 1 } });
    await expect(authorizeUpload("IMAGE", input, [image])).rejects.toThrow(/Research storage is full: this project uses 99 MB of 100 MB/);
  });

  it("counts live, archived and trashed items alike", async () => {
    await storageUsed("p1");
    expect(prismaMock.researchItem.aggregate).toHaveBeenCalledWith({ where: { projectId: "p1" }, _sum: { fileSize: true } });
  });
});

describe("createUploadedItem", () => {
  const meta = { userId: "user-1", projectId: "p1", folderId: "f1" };
  const file = { key: "key-1", name: "Old Map.png", size: 1234, type: "image/png", ufsUrl: "https://app.ufs.sh/f/key-1" };

  beforeEach(() => {
    prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
    prismaMock.$queryRaw.mockResolvedValue([{ id: "p1" }]);
    prismaMock.researchItem.create.mockResolvedValue({ id: "i1" });
  });

  it("creates the item from UploadThing's details at the end of the folder", async () => {
    prismaMock.researchItem.count.mockResolvedValue(3);
    await createUploadedItem("IMAGE", meta, file);
    expect(prismaMock.researchItem.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        folderId: "f1",
        type: "IMAGE",
        title: "Old Map",
        url: file.ufsUrl,
        fileKey: "key-1",
        fileName: "Old Map.png",
        fileSize: 1234,
        mimeType: "image/png",
        position: 3,
      },
      select: { id: true },
    });
  });

  it("puts the item at the top level when its folder was hidden meanwhile", async () => {
    prismaMock.researchFolder.findFirst.mockResolvedValue(null);
    await createUploadedItem("IMAGE", meta, file);
    expect(prismaMock.researchItem.create.mock.calls[0][0].data.folderId).toBeNull();
  });
});
