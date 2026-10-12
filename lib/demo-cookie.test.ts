import { describe, it, expect, vi } from "vitest";
import "@/test/mock-prisma";
import { readDemoCookie, signDemoCookie } from "@/lib/demo-cookie";

const secret = "test-secret";
const later = () => new Date(Date.now() + 60_000);

describe("demo resume cookie", () => {
  it("round-trips the demo's Clerk id", () => {
    expect(readDemoCookie(signDemoCookie("user_1", later(), secret), secret)).toBe("user_1");
  });

  it("rejects a cookie signed with another secret", () => {
    expect(readDemoCookie(signDemoCookie("user_1", later(), "other"), secret)).toBeNull();
  });

  it("rejects a cookie whose id or expiry was edited", () => {
    const [, expires, signature] = signDemoCookie("user_1", later(), secret).split(".");
    expect(readDemoCookie(`user_2.${expires}.${signature}`, secret)).toBeNull();
    expect(readDemoCookie(`user_1.${Number(expires) + 1}.${signature}`, secret)).toBeNull();
  });

  it("rejects an expired cookie", () => {
    const cookie = signDemoCookie("user_1", new Date(Date.now() - 1000), secret);
    expect(readDemoCookie(cookie, secret)).toBeNull();
  });

  it("rejects missing and malformed values", () => {
    for (const value of [undefined, "", "abc", "a.b", "a.b.c.d"]) expect(readDemoCookie(value, secret)).toBeNull();
  });

  it("is not fooled by an id that contains the separator", () => {
    expect(readDemoCookie(signDemoCookie("user.1", later(), secret), secret)).toBeNull();
  });
});

vi.restoreAllMocks();
