import { describe, expect, it } from "vitest";
import { computeFooterStats } from "@/lib/manuscript-stats";

describe("computeFooterStats", () => {
  it("uses the server numbers when there is no live count", () => {
    expect(computeFooterStats({ totalWords: 1000, startWords: 900 }, 50, null)).toEqual({ totalWords: 1000, pages: 4, wordsToday: 100 });
  });

  it("moves the total with the open scene ahead of the save", () => {
    expect(computeFooterStats({ totalWords: 1000, startWords: 900 }, 50, 80)).toEqual({ totalWords: 1030, pages: 5, wordsToday: 130 });
  });

  it("rounds pages up", () => {
    expect(computeFooterStats({ totalWords: 251, startWords: null }, 0, null).pages).toBe(2);
    expect(computeFooterStats({ totalWords: 0, startWords: null }, 0, null).pages).toBe(0);
  });

  it("reports 0 words today before the first save of the day, and never goes negative", () => {
    expect(computeFooterStats({ totalWords: 500, startWords: null }, 0, 20).wordsToday).toBe(0);
    expect(computeFooterStats({ totalWords: 500, startWords: 520 }, 0, null).wordsToday).toBe(0);
  });
});
