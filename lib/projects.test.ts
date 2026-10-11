import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/test/mock-prisma";
import { getLandingPath, getProject, listProjects } from "@/lib/projects";

describe("project queries", () => {
  beforeEach(() => {
    prismaMock.project.findMany.mockReset();
    prismaMock.project.findFirst.mockReset();
  });

  it("lists only the user's projects, most recently edited first", async () => {
    prismaMock.project.findMany.mockResolvedValue([]);
    await listProjects("user-1");
    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, orderBy: { updatedAt: "desc" } }),
    );
  });

  it("scopes getProject by owner so another user's id resolves to null", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    await expect(getProject("user-1", "someone-elses")).resolves.toBeNull();
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "someone-elses", userId: "user-1" } }),
    );
  });
});

describe("getLandingPath", () => {
  beforeEach(() => {
    prismaMock.project.findFirst.mockReset();
  });

  it("returns the last-opened project's manuscript", async () => {
    prismaMock.project.findFirst.mockResolvedValue({ id: "p9" });
    await expect(getLandingPath("user-1")).resolves.toBe("/projects/p9/manuscript");
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", lastOpenedAt: { not: null } },
        orderBy: { lastOpenedAt: "desc" },
      }),
    );
  });

  it("falls back to the project list when nothing has been opened", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    await expect(getLandingPath("user-1")).resolves.toBe("/projects");
  });
});
