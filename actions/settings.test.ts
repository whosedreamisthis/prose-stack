import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { updateTag } from "next/cache"; // after the shared mock is registered, so this is the mocked one

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { updateProjectSettings, updateUserTheme } from "@/actions/settings";

beforeEach(() => {
  vi.clearAllMocks();
  getCurrentUserMock.mockResolvedValue({ id: "user-1" });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("updateProjectSettings", () => {
  it("rejects signed-out callers, a bad project id and an invalid change", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await updateProjectSettings("p1", { title: "A" })).success).toBe(false);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    expect((await updateProjectSettings("", { title: "A" })).success).toBe(false);
    expect((await updateProjectSettings("p1", { title: " " })).success).toBe(false);
    expect((await updateProjectSettings("p1", {})).success).toBe(false);
    expect(prismaMock.project.updateMany).not.toHaveBeenCalled();
  });

  it("writes only the changed fields, scoped to the user's project, and expires the caches", async () => {
    prismaMock.project.updateMany.mockResolvedValue({ count: 1 });
    expect((await updateProjectSettings("p1", { subtitle: "", author: " Bo " })).success).toBe(true);
    expect(prismaMock.project.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: "user-1" },
      data: { subtitle: null, author: "Bo" },
    });
    expect(updateTag).toHaveBeenCalledWith("project:p1");
    expect(updateTag).toHaveBeenCalledWith("projects:user-1");
  });

  it("saves formatting and keeps the project's edited date when nothing else changed", async () => {
    const edited = new Date("2026-01-01T00:00:00Z");
    prismaMock.project.findFirst.mockResolvedValue({ updatedAt: edited });
    prismaMock.project.updateMany.mockResolvedValue({ count: 1 });
    expect((await updateProjectSettings("p1", { fontFamily: "Lora", fontSize: 14, lineSpacing: "SINGLE" })).success).toBe(true);
    expect(prismaMock.project.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: "user-1" },
      data: { fontFamily: "Lora", fontSize: 14, lineSpacing: "SINGLE", updatedAt: edited },
    });
  });

  it("lets a text change move the edited date as usual", async () => {
    prismaMock.project.updateMany.mockResolvedValue({ count: 1 });
    await updateProjectSettings("p1", { title: "New", fontSize: 14 });
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.project.updateMany.mock.calls[0][0].data).not.toHaveProperty("updatedAt");
  });

  it("rejects an out-of-range size, an unknown font and an unknown spacing", async () => {
    expect((await updateProjectSettings("p1", { fontSize: 30 })).success).toBe(false);
    expect((await updateProjectSettings("p1", { fontFamily: "Papyrus" as "Lora" })).success).toBe(false);
    expect((await updateProjectSettings("p1", { lineSpacing: "TRIPLE" as "SINGLE" })).success).toBe(false);
    expect(prismaMock.project.updateMany).not.toHaveBeenCalled();
  });

  it("reports a formatting change on a project that is not the user's", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect((await updateProjectSettings("p1", { fontSize: 14 })).success).toBe(false);
    expect(prismaMock.project.updateMany).not.toHaveBeenCalled();
  });

  it("reports a project that is not the user's", async () => {
    prismaMock.project.updateMany.mockResolvedValue({ count: 0 });
    expect((await updateProjectSettings("p1", { title: "A" })).success).toBe(false);
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("updateUserTheme", () => {
  it("rejects signed-out callers and an unknown theme", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await updateUserTheme("DARK")).success).toBe(false);
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    expect((await updateUserTheme("PURPLE" as "DARK")).success).toBe(false);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("saves the choice on the signed-in user only, and expires the user's tag", async () => {
    prismaMock.user.update.mockResolvedValue({});
    expect((await updateUserTheme("DARK")).success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { theme: "DARK" } });
    expect(updateTag).toHaveBeenCalledWith("user:user-1");
  });

  it("clears the choice with null", async () => {
    prismaMock.user.update.mockResolvedValue({});
    expect((await updateUserTheme(null)).success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { theme: null } });
  });
});
