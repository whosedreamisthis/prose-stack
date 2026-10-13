import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));
const getManuscriptMock = vi.fn();
vi.mock("@/lib/manuscript", () => ({ getManuscript: (...args: unknown[]) => getManuscriptMock(...args) }));

import { searchScenes } from "@/actions/search";

const nodes = [
  { id: "c1", parentId: null, type: "CHAPTER", title: "Ch 1", position: 0 },
  { id: "s1", parentId: "c1", type: "SCENE", title: "One", position: 0 },
  { id: "s2", parentId: "c1", type: "SCENE", title: "Two", position: 1 },
  { id: "s3", parentId: "c1", type: "SCENE", title: "Three", position: 2 },
];

describe("searchScenes", () => {
  beforeEach(() => {
    getCurrentUserMock.mockResolvedValue({ id: "user-1" });
    getManuscriptMock.mockResolvedValue(nodes);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects signed-out callers", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await searchScenes({ projectId: "p1", query: "storm" })).success).toBe(false);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("validates the query before touching the database", async () => {
    expect((await searchScenes({ projectId: "p1", query: "a" })).success).toBe(false);
    expect((await searchScenes({ projectId: "p1", query: "x".repeat(101) })).success).toBe(false);
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("matches nothing, without a query, when the text has no words", async () => {
    const result = await searchScenes({ projectId: "p1", query: "&& || !!" });
    expect(result).toEqual({ success: true, data: { results: [], total: 0, units: [] } });
    expect(prismaMock.$queryRaw).not.toHaveBeenCalled();
  });

  it("passes the user, the project and the sanitized words as parameters, never in the SQL text", async () => {
    prismaMock.$queryRaw.mockResolvedValue([]);
    await searchScenes({ projectId: "p1", query: `storm'; DROP TABLE "User"; --` });
    const [strings, ...values] = prismaMock.$queryRaw.mock.calls[0] as unknown as [TemplateStringsArray, ...unknown[]];
    expect(strings.join("?")).not.toMatch(/storm|DROP/);
    expect(values).toContain("user-1");
    expect(values).toContain("p1");
    expect(values[0]).toBe("(storm) & (drop) & (table) & (user)");
  });

  it("orders by where the match was, then by reading order, and builds snippets", async () => {
    prismaMock.$queryRaw.mockResolvedValue([
      { id: "s3", bucket: 3 },
      { id: "s2", bucket: 1 },
      { id: "s1", bucket: 3 },
    ]);
    prismaMock.manuscriptNode.findMany.mockResolvedValue([
      { id: "s1", summary: null, plainText: "The storm broke." },
      { id: "s2", summary: null, plainText: "Quiet." },
      { id: "s3", summary: null, plainText: "Another storm." },
    ]);
    const result = await searchScenes({ projectId: "p1", query: "storm" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.results.map((r) => [r.id, r.matchedIn])).toEqual([
      ["s2", "label"],
      ["s1", "text"],
      ["s3", "text"],
    ]);
    expect(result.data.results[1].snippet.some((p) => p.match && p.text === "storm")).toBe(true);
    expect(result.data.total).toBe(3);
    expect(prismaMock.manuscriptNode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ["s2", "s1", "s3"] }, projectId: "p1" } }),
    );
  });

  it("shows at most 50 results but reports the full count", async () => {
    prismaMock.$queryRaw.mockResolvedValue(Array.from({ length: 80 }, (_, i) => ({ id: `s${i}`, bucket: 3 })));
    prismaMock.manuscriptNode.findMany.mockResolvedValue([]);
    const result = await searchScenes({ projectId: "p1", query: "storm" });
    expect(result.success && result.data.results).toHaveLength(50);
    expect(result.success && result.data.total).toBe(80);
  });

  it("reports a failure instead of throwing", async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error("boom"));
    expect(await searchScenes({ projectId: "p1", query: "storm" })).toEqual({
      success: false,
      error: "Could not search. Please try again.",
    });
  });
});
