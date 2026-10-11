import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const authMock = vi.fn();
const currentUserMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => authMock(),
  currentUser: () => currentUserMock(),
}));

import { getCurrentUser } from "@/lib/auth";

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
