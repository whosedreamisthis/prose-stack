import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const clerk = {
  users: { deleteUser: vi.fn(), getUserList: vi.fn() },
};
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => clerk }));
vi.mock("@clerk/nextjs/errors", () => ({ isClerkAPIResponseError: (error: { clerkError?: boolean }) => error?.clerkError === true }));

const releaseSlotForDemo = vi.fn();
vi.mock("@/lib/demo-store", () => ({ releaseSlotForDemo: (...args: unknown[]) => releaseSlotForDemo(...args) }));

import { cleanupDemos } from "@/lib/demo-cleanup";

const now = new Date("2026-10-11T12:00:00Z");
const hoursAgo = (h: number) => now.getTime() - h * 3_600_000;

function clerkDemoUser(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    createdAt: hoursAgo(20),
    publicMetadata: { isDemo: true, demoExpiresAt: new Date(hoursAgo(8)).toISOString() },
    primaryEmailAddress: { emailAddress: `demo-${id}@example.com` },
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.user.findMany.mockResolvedValue([]);
  prismaMock.user.deleteMany.mockResolvedValue({ count: 1 });
  clerk.users.deleteUser.mockResolvedValue({});
  clerk.users.getUserList.mockResolvedValue({ data: [] });
  releaseSlotForDemo.mockResolvedValue(undefined);
});

describe("cleanupDemos: expired demos", () => {
  it("looks only at flagged demos whose time has passed", async () => {
    await cleanupDemos(now);
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isDemo: true, demoExpiresAt: { lt: now } } }),
    );
  });

  it("deletes the Clerk user first, then the database user, then frees the IP slot", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: "db-1", clerkId: "user_1" }]);
    const order: string[] = [];
    clerk.users.deleteUser.mockImplementation(async () => void order.push("clerk"));
    prismaMock.user.deleteMany.mockImplementation(async () => (order.push("db"), { count: 1 }));
    releaseSlotForDemo.mockImplementation(async () => void order.push("slot"));

    const result = await cleanupDemos(now);

    expect(order).toEqual(["clerk", "db", "slot"]);
    expect(clerk.users.deleteUser).toHaveBeenCalledWith("user_1");
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({ where: { id: "db-1" } });
    expect(result).toMatchObject({ deleted: 1, failed: 0 });
  });

  it("leaves the database row when the Clerk delete fails, so the next run retries", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: "db-1", clerkId: "user_1" }]);
    clerk.users.deleteUser.mockRejectedValue(new Error("clerk down"));

    const result = await cleanupDemos(now);

    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
    expect(releaseSlotForDemo).not.toHaveBeenCalled();
    expect(result).toMatchObject({ deleted: 0, failed: 1 });
  });

  it("treats a Clerk user that is already gone as deleted", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: "db-1", clerkId: "user_1" }]);
    clerk.users.deleteUser.mockRejectedValue({ clerkError: true, status: 404 });

    const result = await cleanupDemos(now);

    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({ where: { id: "db-1" } });
    expect(result).toMatchObject({ deleted: 1, failed: 0 });
  });

  it("keeps going after one demo fails", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: "db-1", clerkId: "user_1" },
      { id: "db-2", clerkId: "user_2" },
    ]);
    clerk.users.deleteUser.mockRejectedValueOnce(new Error("boom")).mockResolvedValue({});

    const result = await cleanupDemos(now);

    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({ where: { id: "db-2" } });
    expect(result).toMatchObject({ deleted: 1, failed: 1 });
  });

  it("still counts a demo as deleted when only freeing the IP slot fails", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([{ id: "db-1", clerkId: "user_1" }]);
    releaseSlotForDemo.mockRejectedValue(new Error("redis down"));

    const result = await cleanupDemos(now);

    expect(result).toMatchObject({ deleted: 1, failed: 0 });
  });
});

describe("cleanupDemos: orphans in Clerk", () => {
  it("deletes a demo user with no database row once creation has had time to finish", async () => {
    clerk.users.getUserList.mockResolvedValueOnce({ data: [clerkDemoUser("user_orphan", { publicMetadata: { isDemo: true } })] });
    prismaMock.user.findMany.mockResolvedValue([]);

    const result = await cleanupDemos(now);

    expect(clerk.users.deleteUser).toHaveBeenCalledWith("user_orphan");
    expect(result.orphans).toBe(1);
  });

  it("leaves a brand new demo user alone: its row may still be on the way", async () => {
    clerk.users.getUserList.mockResolvedValueOnce({
      data: [clerkDemoUser("user_new", { createdAt: now.getTime() - 60_000, publicMetadata: { isDemo: true } })],
    });

    await cleanupDemos(now);

    expect(clerk.users.deleteUser).not.toHaveBeenCalled();
  });

  it("deletes a Clerk-only demo whose metadata says it has expired, even if it is new", async () => {
    clerk.users.getUserList.mockResolvedValueOnce({ data: [clerkDemoUser("user_expired", { createdAt: now.getTime() - 60_000 })] });

    await cleanupDemos(now);

    expect(clerk.users.deleteUser).toHaveBeenCalledWith("user_expired");
  });

  it("leaves a live demo that has its database row", async () => {
    clerk.users.getUserList.mockResolvedValueOnce({
      data: [clerkDemoUser("user_live", { publicMetadata: { isDemo: true, demoExpiresAt: new Date(hoursAgo(-5)).toISOString() } })],
    });
    prismaMock.user.findMany.mockResolvedValueOnce([]).mockResolvedValue([{ clerkId: "user_live" }]); // none expired, then the lookup of known users

    await cleanupDemos(now);

    expect(clerk.users.deleteUser).not.toHaveBeenCalled();
  });

  it("never touches real users: not flagged as demos, or not on the demo email domain", async () => {
    clerk.users.getUserList.mockResolvedValueOnce({
      data: [
        clerkDemoUser("user_real", { publicMetadata: {}, primaryEmailAddress: { emailAddress: "demo-fan@gmail.com" } }),
        clerkDemoUser("user_lookalike", { primaryEmailAddress: { emailAddress: "demo-x@gmail.com" } }),
      ],
    });

    await cleanupDemos(now);

    expect(clerk.users.deleteUser).not.toHaveBeenCalled();
  });

  it("is idempotent: a second run with nothing left does nothing", async () => {
    const result = await cleanupDemos(now);
    expect(result).toEqual({ deleted: 0, failed: 0, orphans: 0 });
    expect(clerk.users.deleteUser).not.toHaveBeenCalled();
  });
});
