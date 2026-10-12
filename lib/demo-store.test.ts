import { describe, it, expect, beforeEach, vi } from "vitest";
import "@/test/mock-prisma";

/** An in-memory stand-in for the parts of Upstash Redis the store uses. */
const data = new Map<string, string>();
const redis = {
  get: vi.fn(async (key: string) => data.get(key) ?? null),
  set: vi.fn(async (key: string, value: string, options?: { nx?: boolean; xx?: boolean }) => {
    if (options?.nx && data.has(key)) return null;
    if (options?.xx && !data.has(key)) return null;
    data.set(key, value);
    return "OK";
  }),
  del: vi.fn(async (...keys: string[]) => keys.filter((key) => data.delete(key)).length),
};
vi.mock("@upstash/redis", () => ({ Redis: { fromEnv: () => redis } }));

import { DemoStoreError, bindIpSlot, claimIpSlot, isPending, readIpSlot, releaseIpSlot, releaseSlotForDemo } from "@/lib/demo-store";

beforeEach(() => {
  data.clear();
  redis.get.mockImplementation(async (key: string) => data.get(key) ?? null);
});

describe("namespacing on the shared Redis", () => {
  it("only ever touches keys under the prosestack:demo: prefix", async () => {
    await claimIpSlot("hash", "pending:a");
    await readIpSlot("hash");
    await bindIpSlot("hash", "pending:a", "user_1");
    await releaseSlotForDemo("user_1");
    await releaseIpSlot("hash", "nothing");

    const keys = [...redis.get.mock.calls, ...redis.set.mock.calls, ...redis.del.mock.calls].flatMap(([key]) => key);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(key).toMatch(/^prosestack:demo:/);
  });
});

describe("claimIpSlot", () => {
  it("takes a free slot for the demo's 12 hours, and refuses one that is held", async () => {
    expect(await claimIpSlot("hash", "pending:a")).toBe(true);
    expect(redis.set).toHaveBeenCalledWith("prosestack:demo:ip:hash", "pending:a", { nx: true, ex: 43200 });
    expect(await claimIpSlot("hash", "pending:b")).toBe(false);
    expect(await readIpSlot("hash")).toBe("pending:a");
  });
});

describe("bindIpSlot", () => {
  it("replaces our marker with the Clerk id, keeping the slot's lifetime, and records the reverse lookup", async () => {
    await claimIpSlot("hash", "pending:a");
    await bindIpSlot("hash", "pending:a", "user_1");

    expect(await readIpSlot("hash")).toBe("user_1");
    expect(redis.set).toHaveBeenCalledWith("prosestack:demo:ip:hash", "user_1", { xx: true, keepTtl: true });
    expect(data.get("prosestack:demo:user:user_1")).toBe("hash");
  });

  it("refuses when the slot is no longer ours", async () => {
    await claimIpSlot("hash", "pending:someone-else");
    await expect(bindIpSlot("hash", "pending:a", "user_1")).rejects.toBeInstanceOf(DemoStoreError);
    expect(await readIpSlot("hash")).toBe("pending:someone-else");
  });
});

describe("releaseIpSlot", () => {
  it("frees the slot only while it holds what the caller expects", async () => {
    await claimIpSlot("hash", "pending:a");
    await releaseIpSlot("hash", "pending:b");
    expect(await readIpSlot("hash")).toBe("pending:a");
    await releaseIpSlot("hash", "pending:a");
    expect(await readIpSlot("hash")).toBeNull();
  });
});

describe("releaseSlotForDemo", () => {
  it("frees the IP slot of a deleted demo and drops the reverse lookup", async () => {
    await claimIpSlot("hash", "pending:a");
    await bindIpSlot("hash", "pending:a", "user_1");

    await releaseSlotForDemo("user_1");

    expect(await readIpSlot("hash")).toBeNull();
    expect(data.has("prosestack:demo:user:user_1")).toBe(false);
  });

  it("leaves an IP slot that has since been taken by a newer demo", async () => {
    data.set("prosestack:demo:user:user_old", "hash");
    data.set("prosestack:demo:ip:hash", "user_new");

    await releaseSlotForDemo("user_old");

    expect(await readIpSlot("hash")).toBe("user_new");
    expect(data.has("prosestack:demo:user:user_old")).toBe(false);
  });
});

describe("failures", () => {
  it("wraps a Redis error in DemoStoreError so callers can fail closed", async () => {
    redis.get.mockRejectedValue(new Error("network"));
    await expect(readIpSlot("hash")).rejects.toBeInstanceOf(DemoStoreError);
  });
});

describe("isPending", () => {
  it("tells a pending marker from a Clerk id", () => {
    expect(isPending("pending:abc")).toBe(true);
    expect(isPending("user_123")).toBe(false);
  });
});
