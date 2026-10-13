import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));
const researchFileKeysMock = vi.fn();
const deleteStoredFilesMock = vi.fn();
vi.mock("@/lib/research-storage", () => ({
  researchFileKeys: (...args: unknown[]) => researchFileKeysMock(...args),
  deleteStoredFiles: (...args: unknown[]) => deleteStoredFilesMock(...args),
}));
const seedManuscriptMock = vi.fn();
vi.mock("@/lib/manuscript", () => ({ seedManuscript: (...args: unknown[]) => seedManuscriptMock(...args) }));

import { createProject, deleteProject, markProjectOpened, updateProject } from "@/actions/projects";
import { MAX_PROJECTS_PER_USER, type CreateProjectInput } from "@/lib/project-config";

const input: CreateProjectInput = { title: "My Book", subtitle: "", author: "Ada", coverDesign: "classic", coverColor: "#1e3a5f" };

// Run the transaction callback against the mocked client, like Prisma's interactive transactions do.
function useInteractiveTransaction() {
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
}

describe("createProject", () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    useInteractiveTransaction();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const result = await createProject(input);
    expect(result.success).toBe(false);
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("validates input before touching the database", async () => {
    const result = await createProject({ ...input, title: "  " });
    expect(result).toEqual({ success: false, error: "Title is required" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("creates the project for the signed-in user, ignoring any client-supplied owner", async () => {
    prismaMock.project.count.mockResolvedValue(0);
    prismaMock.project.create.mockResolvedValue({ id: "p1" });

    const result = await createProject({ ...input, userId: "attacker" } as CreateProjectInput);

    expect(result).toEqual({ success: true, data: { id: "p1" } });
    expect(prismaMock.project.count).toHaveBeenCalledWith({ where: { userId: "user-1" } });
    expect(prismaMock.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", title: "My Book", subtitle: null }),
      }),
    );
  });

  it("stores the chosen story structure, or none, and rejects an unknown one", async () => {
    prismaMock.project.count.mockResolvedValue(0);
    prismaMock.project.create.mockResolvedValue({ id: "p1" });

    await createProject({ ...input, storyTemplateId: "romance" });
    expect(prismaMock.project.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storyTemplateId: "romance" }) }),
    );
    await createProject(input);
    expect(prismaMock.project.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ storyTemplateId: null }) }),
    );

    prismaMock.project.create.mockClear();
    expect((await createProject({ ...input, storyTemplateId: "nope" })).success).toBe(false);
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("seeds Chapter 1 / Scene 1 in the new project", async () => {
    prismaMock.project.count.mockResolvedValue(0);
    prismaMock.project.create.mockResolvedValue({ id: "p1" });
    await createProject(input);
    expect(seedManuscriptMock).toHaveBeenCalledWith(prismaMock, "p1");
  });

  it("locks the user row before counting so concurrent creates cannot exceed the limit", async () => {
    prismaMock.project.count.mockResolvedValue(0);
    prismaMock.project.create.mockResolvedValue({ id: "p1" });
    await createProject(input);
    const lockOrder = prismaMock.$queryRaw.mock.invocationCallOrder[0];
    const countOrder = prismaMock.project.count.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(countOrder);
    const [strings] = prismaMock.$queryRaw.mock.calls[0] as [TemplateStringsArray];
    expect(strings.join("?")).toContain("FOR UPDATE");
  });

  it("rejects a project beyond the limit", async () => {
    prismaMock.project.count.mockResolvedValue(MAX_PROJECTS_PER_USER);
    const result = await createProject(input);
    expect(result.success).toBe(false);
    expect(prismaMock.project.create).not.toHaveBeenCalled();
  });

  it("allows the last project under the limit", async () => {
    prismaMock.project.count.mockResolvedValue(MAX_PROJECTS_PER_USER - 1);
    prismaMock.project.create.mockResolvedValue({ id: "p5" });
    await expect(createProject(input)).resolves.toMatchObject({ success: true });
  });

  it("returns a friendly error when the database fails", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("db down"));
    const result = await createProject(input);
    expect(result.success).toBe(false);
  });
});

describe("deleteProject", () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    researchFileKeysMock.mockReset().mockResolvedValue([]);
    deleteStoredFilesMock.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("deletes only a project the user owns", async () => {
    prismaMock.project.deleteMany.mockResolvedValue({ count: 1 });
    await expect(deleteProject("p1")).resolves.toEqual({ success: true, data: undefined });
    expect(prismaMock.project.deleteMany).toHaveBeenCalledWith({ where: { id: "p1", userId: "user-1" } });
  });

  it("deletes the project's stored research files once the project is gone", async () => {
    researchFileKeysMock.mockResolvedValue(["k1", "k2"]);
    prismaMock.project.deleteMany.mockResolvedValue({ count: 1 });
    await deleteProject("p1");
    expect(researchFileKeysMock).toHaveBeenCalledWith({ projectId: "p1", project: { userId: "user-1" } });
    expect(deleteStoredFilesMock).toHaveBeenCalledWith(["k1", "k2"]);
  });

  it("reports not found when the project is missing or belongs to someone else", async () => {
    prismaMock.project.deleteMany.mockResolvedValue({ count: 0 });
    const result = await deleteProject("not-mine");
    expect(result).toEqual({ success: false, error: "Project not found." });
    expect(deleteStoredFilesMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed id without querying", async () => {
    const result = await deleteProject("");
    expect(result).toEqual({ success: false, error: "Project not found." });
    expect(prismaMock.project.deleteMany).not.toHaveBeenCalled();
  });

  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const result = await deleteProject("p1");
    expect(result.success).toBe(false);
    expect(prismaMock.project.deleteMany).not.toHaveBeenCalled();
  });
});

describe("markProjectOpened", () => {
  beforeEach(() => {
    prismaMock.$executeRaw.mockReset();
  });

  it("does nothing for signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    await markProjectOpened("p1");
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
  });

  it("ignores a malformed id", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    await markProjectOpened("");
    expect(prismaMock.$executeRaw).not.toHaveBeenCalled();
  });

  it("updates lastOpenedAt scoped to the owner, without a Prisma update that would bump updatedAt", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    prismaMock.$executeRaw.mockResolvedValue(1);
    await markProjectOpened("p1");
    expect(prismaMock.$executeRaw).toHaveBeenCalledOnce();
    const [strings, ...values] = prismaMock.$executeRaw.mock.calls[0] as [TemplateStringsArray, ...string[]];
    expect(strings.join("?")).toContain('"lastOpenedAt"');
    expect(values).toEqual(["p1", "user-1"]);
  });
});

describe("updateProject", () => {
  const edits = { title: "New Title", subtitle: "", author: "Grace", coverColor: "#7f1d1d" };

  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const result = await updateProject("p1", edits);
    expect(result.success).toBe(false);
    expect(prismaMock.project.updateMany).not.toHaveBeenCalled();
  });

  it("validates input before touching the database", async () => {
    const result = await updateProject("p1", { ...edits, author: " " });
    expect(result).toEqual({ success: false, error: "Author is required" });
    expect(prismaMock.project.updateMany).not.toHaveBeenCalled();
  });

  it("updates only the owner's project and only the editable fields", async () => {
    prismaMock.project.updateMany.mockResolvedValue({ count: 1 });
    const result = await updateProject("p1", { ...edits, coverDesign: "bold" } as typeof edits);
    expect(result.success).toBe(true);
    expect(prismaMock.project.updateMany).toHaveBeenCalledWith({
      where: { id: "p1", userId: "user-1" },
      data: { title: "New Title", subtitle: null, author: "Grace", coverColor: "#7f1d1d" },
    });
  });

  it("reports not found when the project is not the caller's", async () => {
    prismaMock.project.updateMany.mockResolvedValue({ count: 0 });
    expect(await updateProject("p1", edits)).toEqual({ success: false, error: "Project not found." });
  });
});
