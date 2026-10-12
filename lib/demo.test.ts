import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/test/mock-prisma";

const clerk = {
  users: { createUser: vi.fn(), deleteUser: vi.fn() },
  signInTokens: { createSignInToken: vi.fn() },
};
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => clerk }));

const store = {
  readIpSlot: vi.fn(),
  claimIpSlot: vi.fn(),
  bindIpSlot: vi.fn(),
  releaseIpSlot: vi.fn(),
};
vi.mock("@/lib/demo-store", () => {
  class DemoStoreError extends Error {}
  return {
    DemoStoreError,
    isPending: (value: string) => value.startsWith("pending:"),
    readIpSlot: (...args: unknown[]) => store.readIpSlot(...args),
    claimIpSlot: (...args: unknown[]) => store.claimIpSlot(...args),
    bindIpSlot: (...args: unknown[]) => store.bindIpSlot(...args),
    releaseIpSlot: (...args: unknown[]) => store.releaseIpSlot(...args),
  };
});

const seedDemoProject = vi.fn();
vi.mock("@/lib/demo-seed", () => ({ seedDemoProject: (...args: unknown[]) => seedDemoProject(...args) }));

import { signDemoCookie } from "@/lib/demo-cookie";
import { hashIp } from "@/lib/demo-ip";
import { DemoStoreError } from "@/lib/demo-store";
import { startDemo } from "@/lib/demo";

const secret = "test-secret";
const ip = "203.0.113.7";
const ipHash = hashIp(ip, secret);
const future = () => new Date(Date.now() + 3_600_000);
const liveDemoRow = () => ({ isDemo: true, demoExpiresAt: future() });
const expiredDemoRow = () => ({ isDemo: true, demoExpiresAt: new Date(Date.now() - 1000) });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.$transaction.mockImplementation(async (fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock));
  prismaMock.user.upsert.mockResolvedValue({ id: "db-1" });
  prismaMock.user.deleteMany.mockResolvedValue({ count: 1 });
  clerk.users.createUser.mockResolvedValue({ id: "user_new" });
  clerk.users.deleteUser.mockResolvedValue({});
  clerk.signInTokens.createSignInToken.mockResolvedValue({ token: "ticket-1" });
  seedDemoProject.mockResolvedValue("p1");
  store.readIpSlot.mockResolvedValue(null);
  store.claimIpSlot.mockResolvedValue(true);
  store.bindIpSlot.mockResolvedValue(undefined);
  store.releaseIpSlot.mockResolvedValue(undefined);
});

describe("startDemo: a new demo", () => {
  it("claims the IP, creates a flagged Clerk user, seeds the project, binds the slot and returns a ticket", async () => {
    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: true, ticket: "ticket-1", clerkId: "user_new", created: true });
    expect(store.claimIpSlot).toHaveBeenCalledWith(ipHash, expect.stringMatching(/^pending:/));
    expect(clerk.users.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ publicMetadata: expect.objectContaining({ isDemo: true, demoExpiresAt: expect.any(String) }) }),
    );
    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clerkId: "user_new" },
        create: expect.objectContaining({ isDemo: true, demoExpiresAt: expect.any(Date) }),
      }),
    );
    expect(seedDemoProject).toHaveBeenCalledWith(prismaMock, "db-1");
    expect(store.bindIpSlot).toHaveBeenCalledWith(ipHash, expect.stringMatching(/^pending:/), "user_new");
    expect(clerk.signInTokens.createSignInToken).toHaveBeenCalledWith(expect.objectContaining({ userId: "user_new" }));
  });

  it("never stores or sends the raw IP", async () => {
    await startDemo({ ip, cookieValue: undefined, secret });
    const everything = JSON.stringify([store.claimIpSlot.mock.calls, store.bindIpSlot.mock.calls, store.readIpSlot.mock.calls]);
    expect(everything).not.toContain(ip);
  });

  it("gives the demo a 12 hour lifetime", async () => {
    const result = await startDemo({ ip, cookieValue: undefined, secret });
    if (!result.ok) throw new Error("expected a demo");
    const hours = (result.expiresAt.getTime() - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(11.9);
    expect(hours).toBeLessThanOrEqual(12);
  });
});

describe("startDemo: resuming", () => {
  it("signs back into the demo the IP already has, without creating a Clerk user", async () => {
    store.readIpSlot.mockResolvedValue("user_existing");
    prismaMock.user.findUnique.mockResolvedValue(liveDemoRow());

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: true, clerkId: "user_existing", created: false });
    expect(clerk.users.createUser).not.toHaveBeenCalled();
    expect(store.claimIpSlot).not.toHaveBeenCalled();
  });

  it("waits for a demo another request from the same IP is still creating", async () => {
    store.readIpSlot.mockResolvedValueOnce("pending:other").mockResolvedValue("user_winner");
    prismaMock.user.findUnique.mockResolvedValue(liveDemoRow());

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: true, clerkId: "user_winner", created: false });
    expect(clerk.users.createUser).not.toHaveBeenCalled();
  });

  it("signs into the winner when two presses race and this one loses the claim", async () => {
    store.readIpSlot.mockResolvedValueOnce(null).mockResolvedValue("user_winner");
    store.claimIpSlot.mockResolvedValue(false);
    prismaMock.user.findUnique.mockResolvedValue(liveDemoRow());

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: true, clerkId: "user_winner", created: false });
    expect(clerk.users.createUser).not.toHaveBeenCalled();
  });

  it("frees a slot that names a demo that is gone, then creates a new one", async () => {
    store.readIpSlot.mockResolvedValue("user_gone");
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(store.releaseIpSlot).toHaveBeenCalledWith(ipHash, "user_gone");
    expect(result).toMatchObject({ ok: true, created: true });
  });

  it("treats an expired demo as gone", async () => {
    store.readIpSlot.mockResolvedValue("user_old");
    prismaMock.user.findUnique.mockResolvedValue(expiredDemoRow());

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: true, created: true });
  });

  it("falls back to the resume cookie when the IP has no demo (the IP changed)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(liveDemoRow());
    const cookieValue = signDemoCookie("user_cookie", future(), secret);

    const result = await startDemo({ ip, cookieValue, secret });

    expect(result).toMatchObject({ ok: true, clerkId: "user_cookie", created: false });
    expect(clerk.users.createUser).not.toHaveBeenCalled();
  });

  it("ignores a cookie for a demo that has expired and starts a new demo", async () => {
    prismaMock.user.findUnique.mockResolvedValue(expiredDemoRow());
    const cookieValue = signDemoCookie("user_cookie", future(), secret);

    const result = await startDemo({ ip, cookieValue, secret });

    expect(result).toMatchObject({ ok: true, created: true, clerkId: "user_new" });
  });

  it("ignores a forged cookie", async () => {
    const result = await startDemo({ ip, cookieValue: signDemoCookie("user_cookie", future(), "other-secret"), secret });
    expect(result).toMatchObject({ created: true });
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("startDemo: when Redis is down", () => {
  beforeEach(() => {
    store.readIpSlot.mockRejectedValue(new DemoStoreError("down"));
  });

  it("refuses a new demo with 503 and creates no Clerk user", async () => {
    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(clerk.users.createUser).not.toHaveBeenCalled();
    expect(store.claimIpSlot).not.toHaveBeenCalled();
  });

  it("still resumes through the cookie", async () => {
    prismaMock.user.findUnique.mockResolvedValue(liveDemoRow());
    const result = await startDemo({ ip, cookieValue: signDemoCookie("user_cookie", future(), secret), secret });
    expect(result).toMatchObject({ ok: true, clerkId: "user_cookie" });
  });

  it("refuses when the claim itself fails", async () => {
    store.readIpSlot.mockResolvedValue(null);
    store.claimIpSlot.mockRejectedValue(new DemoStoreError("down"));
    const result = await startDemo({ ip, cookieValue: undefined, secret });
    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(clerk.users.createUser).not.toHaveBeenCalled();
  });
});

describe("startDemo: no IP", () => {
  it("refuses a new demo when the proxy gave no address", async () => {
    const result = await startDemo({ ip: null, cookieValue: undefined, secret });
    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(clerk.users.createUser).not.toHaveBeenCalled();
  });
});

describe("startDemo: cleaning up a failed creation", () => {
  it("deletes the Clerk user, the database user and the IP slot when seeding fails", async () => {
    seedDemoProject.mockRejectedValue(new Error("seed failed"));

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(clerk.users.deleteUser).toHaveBeenCalledWith("user_new");
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({ where: { clerkId: "user_new" } });
    expect(store.releaseIpSlot).toHaveBeenCalledWith(ipHash, "user_new");
    expect(store.releaseIpSlot).toHaveBeenCalledWith(ipHash, expect.stringMatching(/^pending:/));
  });

  it("frees only the IP slot when the Clerk user was never created", async () => {
    clerk.users.createUser.mockRejectedValue(new Error("clerk down"));

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: false, status: 500 });
    expect(clerk.users.deleteUser).not.toHaveBeenCalled();
    expect(store.releaseIpSlot).toHaveBeenCalledWith(ipHash, expect.stringMatching(/^pending:/));
  });

  it("keeps going through the other rollback steps when one fails", async () => {
    seedDemoProject.mockRejectedValue(new Error("seed failed"));
    clerk.users.deleteUser.mockRejectedValue(new Error("clerk delete failed"));

    await startDemo({ ip, cookieValue: undefined, secret });

    expect(prismaMock.user.deleteMany).toHaveBeenCalled();
    expect(store.releaseIpSlot).toHaveBeenCalled();
  });

  it("reports 503 and rolls back when the slot is lost before it can be bound", async () => {
    store.bindIpSlot.mockRejectedValue(new DemoStoreError("slot lost"));

    const result = await startDemo({ ip, cookieValue: undefined, secret });

    expect(result).toMatchObject({ ok: false, status: 503 });
    expect(clerk.users.deleteUser).toHaveBeenCalledWith("user_new");
  });
});
