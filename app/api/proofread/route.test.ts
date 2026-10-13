import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const getCurrentUserMock = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUserMock() }));

import { POST } from "@/app/api/proofread/route";
import { DEMO_RATE_LIMIT_PER_MINUTE, MAX_REQUEST_CHARS } from "@/lib/proofread/config";
import { resetRateLimits } from "@/lib/proofread/rate-limit";

const post = (body: unknown) =>
  POST(new Request("http://localhost/api/proofread", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) }));

const valid = { projectId: "p1", blocks: ["She walked to the the door."], categories: ["usage", "style", "consistency"], quotes: null };

beforeEach(() => {
  resetRateLimits();
  getCurrentUserMock.mockResolvedValue({ id: "user-1", isDemo: false });
  prismaMock.project.findFirst.mockResolvedValue({ id: "p1" });
  prismaMock.character.findMany.mockResolvedValue([{ name: "Edric Vane" }]);
  prismaMock.place.findMany.mockResolvedValue([]);
  prismaMock.proofreadIgnore.findMany.mockResolvedValue([]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/proofread", () => {
  it("refuses a signed-out caller", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    expect((await post(valid)).status).toBe(401);
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
  });

  it("returns suggestions for the text, with offsets into each paragraph", async () => {
    const response = await post(valid);
    expect(response.status).toBe(200);
    const { suggestions } = await response.json();
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ rule: "repeated-word", block: 0, text: "the the", replacement: "the" });
  });

  it("checks only the project's own data, by the signed-in owner", async () => {
    await post(valid);
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "p1", userId: "user-1" } }));
  });

  it("refuses a project that is not the caller's", async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);
    expect((await post(valid)).status).toBe(404);
  });

  it("leaves out what the writer ignored", async () => {
    prismaMock.proofreadIgnore.findMany.mockResolvedValue([{ kind: "WORD", value: "the" }]);
    const { suggestions } = await (await post(valid)).json();
    expect(suggestions).toEqual([]);
  });

  it("uses the project's names for the consistency check", async () => {
    const { suggestions } = await (await post({ ...valid, blocks: ["Edrik came."] })).json();
    expect(suggestions[0]).toMatchObject({ rule: "name-variant", replacement: "Edric" });
  });

  it("rejects malformed and oversized input", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post({ ...valid, blocks: [] })).status).toBe(400);
    expect((await post({ ...valid, categories: [] })).status).toBe(400);
    expect((await post({ ...valid, categories: ["grammar"] })).status).toBe(400);
    const blocks = Array.from({ length: 4 }, () => "a".repeat(MAX_REQUEST_CHARS / 3));
    expect((await post({ ...valid, blocks })).status).toBe(413);
  });

  it("limits how fast a demo user can proofread", async () => {
    getCurrentUserMock.mockResolvedValue({ id: "demo-1", isDemo: true });
    for (let i = 0; i < DEMO_RATE_LIMIT_PER_MINUTE; i++) expect((await post(valid)).status).toBe(200);
    expect((await post(valid)).status).toBe(429);
  });

  it("reports a failure without touching the scene", async () => {
    prismaMock.character.findMany.mockRejectedValue(new Error("db down"));
    const response = await post(valid);
    expect(response.status).toBe(500);
    expect((await response.json()).error).toMatch(/failed/i);
  });
});
