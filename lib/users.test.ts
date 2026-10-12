import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const researchFileKeys = vi.fn();
const deleteStoredFiles = vi.fn();
vi.mock("@/lib/research-storage", () => ({
  researchFileKeys: (...args: unknown[]) => researchFileKeys(...args),
  deleteStoredFiles: (...args: unknown[]) => deleteStoredFiles(...args),
}));

import { countUsers, deleteUserByClerkId, formatName, upsertUser } from "@/lib/users";

describe("countUsers", () => {
  beforeEach(() => {
    prismaMock.user.count.mockReset();
  });

  it("returns the count from the mocked client without touching a database", async () => {
    prismaMock.user.count.mockResolvedValue(3);
    await expect(countUsers()).resolves.toBe(3);
    expect(prismaMock.user.count).toHaveBeenCalledOnce();
  });
});

describe("upsertUser", () => {
  beforeEach(() => {
    prismaMock.user.upsert.mockReset();
  });

  it("upserts by clerkId so webhook retries and the fallback do not duplicate", async () => {
    prismaMock.user.upsert.mockResolvedValue({ id: "u1" });
    await upsertUser({ clerkId: "user_1", email: "a@b.co", name: "Ada" });
    expect(prismaMock.user.upsert).toHaveBeenCalledWith({
      where: { clerkId: "user_1" },
      create: { clerkId: "user_1", email: "a@b.co", name: "Ada" },
      update: { email: "a@b.co", name: "Ada" },
    });
  });

  it("rejects invalid input before reaching the database", async () => {
    await expect(upsertUser({ clerkId: "", email: null, name: null })).rejects.toThrow();
    await expect(upsertUser({ clerkId: "user_1", email: "nope", name: null })).rejects.toThrow();
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
  });
});

describe("deleteUserByClerkId", () => {
  beforeEach(() => {
    researchFileKeys.mockReset().mockResolvedValue([]);
    deleteStoredFiles.mockReset();
  });

  it("deletes by clerkId without failing when the row is already gone", async () => {
    prismaMock.user.deleteMany.mockResolvedValue({ count: 0 });
    await deleteUserByClerkId("user_1");
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({ where: { clerkId: "user_1" } });
  });

  it("deletes the user's stored research files after the rows", async () => {
    researchFileKeys.mockResolvedValue(["k1"]);
    prismaMock.user.deleteMany.mockResolvedValue({ count: 1 });
    await deleteUserByClerkId("user_1");
    expect(researchFileKeys).toHaveBeenCalledWith({ project: { user: { clerkId: "user_1" } } });
    expect(deleteStoredFiles).toHaveBeenCalledWith(["k1"]);
  });
});

describe("formatName", () => {
  it("joins the parts that exist and returns null when empty", () => {
    expect(formatName("Ada", "Lovelace")).toBe("Ada Lovelace");
    expect(formatName("Ada", null)).toBe("Ada");
    expect(formatName(null, undefined)).toBeNull();
  });
});
