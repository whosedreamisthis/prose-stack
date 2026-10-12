import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/test/mock-prisma";

const cleanupDemos = vi.fn();
vi.mock("@/lib/demo-cleanup", () => ({ cleanupDemos: () => cleanupDemos() }));

import { NextRequest } from "next/server";
import { GET } from "@/app/api/cron/cleanup-demos/route";

const request = (authorization?: string) =>
  new NextRequest("http://localhost/api/cron/cleanup-demos", { headers: authorization ? { authorization } : {} });

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "s3cret");
  vi.spyOn(console, "error").mockImplementation(() => {});
  cleanupDemos.mockResolvedValue({ deleted: 2, failed: 0, orphans: 1 });
});

describe("GET /api/cron/cleanup-demos", () => {
  it("runs the cleanup for the right bearer token and returns its summary", async () => {
    const response = await GET(request("Bearer s3cret"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ deleted: 2, failed: 0, orphans: 1 });
  });

  it("refuses a missing, wrong or differently shaped token without running anything", async () => {
    for (const header of [undefined, "Bearer wrong", "s3cret", "Basic s3cret"]) {
      expect((await GET(request(header))).status).toBe(401);
    }
    expect(cleanupDemos).not.toHaveBeenCalled();
  });

  it("refuses everything when CRON_SECRET is not set", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await GET(request("Bearer "))).status).toBe(401);
    expect(cleanupDemos).not.toHaveBeenCalled();
  });

  it("answers 500 when the cleanup throws", async () => {
    cleanupDemos.mockRejectedValue(new Error("boom"));
    expect((await GET(request("Bearer s3cret"))).status).toBe(500);
  });
});
