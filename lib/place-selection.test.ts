import { describe, it, expect } from "vitest";
import { resolveActivePlace } from "@/lib/place-selection";
import type { PlaceSummary } from "@/types/places";

const first: PlaceSummary = { id: "a", name: "Harbour" };
const second: PlaceSummary = { id: "b", name: "Lighthouse" };

describe("resolveActivePlace", () => {
  it("returns the requested place", () => {
    expect(resolveActivePlace([first, second], "b")).toBe(second);
  });

  it("falls back to the first place when none or a stale one is requested", () => {
    expect(resolveActivePlace([first, second], undefined)).toBe(first);
    expect(resolveActivePlace([first, second], "gone")).toBe(first);
  });

  it("returns null when there are no places", () => {
    expect(resolveActivePlace([], "a")).toBeNull();
  });
});
