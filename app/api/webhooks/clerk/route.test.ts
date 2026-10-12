import { describe, it, expect, beforeEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { prismaMock } from "@/test/mock-prisma";

vi.mock("@/lib/research-storage", () => ({ researchFileKeys: async () => [], deleteStoredFiles: async () => {} }));
const verifyWebhookMock = vi.fn();
vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: (req: unknown) => verifyWebhookMock(req),
}));

import { POST } from "@/app/api/webhooks/clerk/route";

const req = {} as NextRequest;

describe("POST /api/webhooks/clerk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("rejects an invalid signature without touching the database", async () => {
    verifyWebhookMock.mockRejectedValue(new Error("bad signature"));
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(prismaMock.user.upsert).not.toHaveBeenCalled();
    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
  });

  it("creates the user on user.created using the primary email", async () => {
    verifyWebhookMock.mockResolvedValue({
      type: "user.created",
      data: {
        id: "user_1",
        first_name: "Ada",
        last_name: "Lovelace",
        primary_email_address_id: "idn_2",
        email_addresses: [
          { id: "idn_1", email_address: "old@example.com" },
          { id: "idn_2", email_address: "ada@example.com" },
        ],
      },
    });
    prismaMock.user.upsert.mockResolvedValue({});

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { clerkId: "user_1", email: "ada@example.com", name: "Ada Lovelace" },
      }),
    );
  });

  it("deletes the user on user.deleted", async () => {
    verifyWebhookMock.mockResolvedValue({ type: "user.deleted", data: { id: "user_1" } });
    prismaMock.user.deleteMany.mockResolvedValue({ count: 1 });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({ where: { clerkId: "user_1" } });
  });

  it("returns 500 when the database write fails so Clerk retries", async () => {
    verifyWebhookMock.mockResolvedValue({ type: "user.deleted", data: { id: "user_1" } });
    prismaMock.user.deleteMany.mockRejectedValue(new Error("db down"));
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
