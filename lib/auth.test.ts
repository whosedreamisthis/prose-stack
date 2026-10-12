import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const authMock = vi.fn();
const currentUserMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  currentUser: () => currentUserMock(),
}));

const redirectMock = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT ${path}`);
});
vi.mock("next/navigation", () => ({ redirect: (path: string) => redirectMock(path) }));

import { getCurrentUser, isExpiredDemo } from "@/lib/auth";

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    await expect(getCurrentUser()).resolves.toBeNull();
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns the existing row without calling Clerk", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", clerkId: "user_1" });
    await expect(getCurrentUser()).resolves.toEqual({ id: "u1", clerkId: "user_1" });
    expect(currentUserMock).not.toHaveBeenCalled();
  });

  it("creates the user on first request when the webhook has not arrived", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    prismaMock.user.findUnique.mockResolvedValue(null);
    currentUserMock.mockResolvedValue({
      id: "user_1",
      firstName: "Ada",
      lastName: "Lovelace",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    });
    prismaMock.user.upsert.mockResolvedValue({ id: "u1", clerkId: "user_1" });

    await getCurrentUser();

    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { clerkId: "user_1", email: "ada@example.com", name: "Ada Lovelace" },
      }),
    );
  });
});

describe("expired demos", () => {
  const demo = (demoExpiresAt: Date | null, isDemo = true) => ({ id: "u1", clerkId: "user_1", isDemo, demoExpiresAt });

  it("isExpiredDemo is true only for a flagged demo whose time has passed", () => {
    expect(isExpiredDemo(demo(new Date(Date.now() - 1000)))).toBe(true);
    expect(isExpiredDemo(demo(new Date(Date.now() + 60_000)))).toBe(false);
    expect(isExpiredDemo(demo(null))).toBe(false);
    expect(isExpiredDemo(demo(new Date(Date.now() - 1000), false))).toBe(false);
  });

  it("sends an expired demo to /api/demo/expired instead of returning its user", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    prismaMock.user.findUnique.mockResolvedValue(demo(new Date(Date.now() - 1000)));
    await expect(getCurrentUser()).rejects.toThrow("NEXT_REDIRECT /api/demo/expired");
    expect(redirectMock).toHaveBeenCalledWith("/api/demo/expired");
  });

  it("returns a live demo as usual", async () => {
    authMock.mockResolvedValue({ userId: "user_1" });
    const row = demo(new Date(Date.now() + 3_600_000));
    prismaMock.user.findUnique.mockResolvedValue(row);
    await expect(getCurrentUser()).resolves.toEqual(row);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
