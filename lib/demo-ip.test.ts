import { describe, it, expect } from "vitest";
import "@/test/mock-prisma";
import { clientIp, hashIp } from "@/lib/demo-ip";

const headers = (init: Record<string, string>) => new Headers(init);

describe("clientIp", () => {
  it("takes the first address of x-forwarded-for", () => {
    expect(clientIp(headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), true)).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(headers({ "x-real-ip": "198.51.100.2" }), true)).toBe("198.51.100.2");
  });

  it("refuses a request with no address in production, but not in development", () => {
    expect(clientIp(headers({}), true)).toBeNull();
    expect(clientIp(headers({}), false)).toBe("127.0.0.1");
  });
});

describe("hashIp", () => {
  it("is stable, keyed by the secret, and never contains the address", () => {
    const hash = hashIp("203.0.113.7", "secret");
    expect(hashIp("203.0.113.7", "secret")).toBe(hash);
    expect(hashIp("203.0.113.7", "another")).not.toBe(hash);
    expect(hashIp("203.0.113.8", "secret")).not.toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("203");
  });
});
