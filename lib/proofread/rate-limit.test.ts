import { beforeEach, describe, expect, it } from "vitest";
import { allowRequest, resetRateLimits } from "@/lib/proofread/rate-limit";

beforeEach(() => resetRateLimits());

describe("allowRequest", () => {
  it("allows up to the limit in a minute, then refuses", () => {
    for (let i = 0; i < 3; i++) expect(allowRequest("a", 3, 1000 + i)).toBe(true);
    expect(allowRequest("a", 3, 1010)).toBe(false);
  });

  it("allows again once the minute has passed", () => {
    for (let i = 0; i < 3; i++) allowRequest("a", 3, 1000);
    expect(allowRequest("a", 3, 1000 + 59_999)).toBe(false);
    expect(allowRequest("a", 3, 1000 + 60_000)).toBe(true);
  });

  it("counts each key on its own", () => {
    for (let i = 0; i < 3; i++) allowRequest("a", 3, 1000);
    expect(allowRequest("b", 3, 1000)).toBe(true);
  });
});
