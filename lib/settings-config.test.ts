import { describe, it, expect } from "vitest";
import {
  getChanges,
  getDirtyTabs,
  hasChanges,
  resetTab,
  updateProjectSettingsSchema,
  type SettingsValues,
} from "@/lib/settings-config";

const saved: SettingsValues = {
  title: "Book",
  subtitle: "",
  author: "Ann",
  theme: null,
  fontFamily: "Georgia",
  fontSize: 12,
  lineSpacing: "DOUBLE",
};

describe("getChanges", () => {
  it("reports nothing for an unchanged draft, ignoring surrounding spaces", () => {
    expect(hasChanges(getChanges(saved, { ...saved, title: " Book " }))).toBe(false);
  });

  it("reports only the project fields that changed", () => {
    expect(getChanges(saved, { ...saved, author: "Bo" })).toEqual({ project: { author: "Bo" } });
  });

  it("reports a theme change, including clearing the choice", () => {
    expect(getChanges(saved, { ...saved, theme: "DARK" })).toEqual({ project: {}, theme: "DARK" });
    expect(getChanges({ ...saved, theme: "DARK" }, saved)).toEqual({ project: {}, theme: null });
  });
});

describe("getChanges (formatting)", () => {
  it("reports each formatting field that changed", () => {
    expect(getChanges(saved, { ...saved, fontFamily: "Courier Prime", fontSize: 14, lineSpacing: "SINGLE" })).toEqual({
      project: { fontFamily: "Courier Prime", fontSize: 14, lineSpacing: "SINGLE" },
    });
  });
});

describe("getDirtyTabs", () => {
  it("marks the tab that has edits", () => {
    expect(getDirtyTabs(saved, { ...saved, title: "New" })).toEqual({ general: true, appearance: false, formatting: false, labels: false });
    expect(getDirtyTabs(saved, { ...saved, theme: "LIGHT" })).toEqual({ general: false, appearance: true, formatting: false, labels: false });
    expect(getDirtyTabs(saved, { ...saved, fontSize: 14 })).toEqual({ general: false, appearance: false, formatting: true, labels: false });
  });
});

describe("resetTab", () => {
  it("clears the theme on Appearance and leaves other edits alone", () => {
    const draft = { ...saved, title: "Edited", theme: "DARK" as const };
    expect(resetTab(draft, "appearance")).toEqual({ ...draft, theme: null });
    expect(resetTab(draft, "general")).toEqual(draft);
  });

  it("puts Georgia, 12 and double back on Formatting and leaves the rest", () => {
    const draft = { ...saved, title: "Edited", theme: "DARK" as const, fontFamily: "Lora" as const, fontSize: 16, lineSpacing: "SINGLE" as const };
    expect(resetTab(draft, "formatting")).toEqual({ ...draft, fontFamily: "Georgia", fontSize: 12, lineSpacing: "DOUBLE" });
  });
});

describe("updateProjectSettingsSchema", () => {
  it("accepts a partial update and rejects an empty one", () => {
    expect(updateProjectSettingsSchema.safeParse({ title: "New" }).success).toBe(true);
    expect(updateProjectSettingsSchema.safeParse({}).success).toBe(false);
  });

  it("applies the creation rules", () => {
    expect(updateProjectSettingsSchema.safeParse({ title: "  " }).success).toBe(false);
    expect(updateProjectSettingsSchema.safeParse({ author: "x".repeat(81) }).success).toBe(false);
    expect(updateProjectSettingsSchema.safeParse({ subtitle: "x".repeat(161) }).success).toBe(false);
    expect(updateProjectSettingsSchema.safeParse({ subtitle: "" }).success).toBe(true);
  });

  it("rejects a font size outside 10 to 18, a fractional one, an unknown font and an unknown spacing", () => {
    for (const size of [9, 19, 12.5, "12", NaN]) expect(updateProjectSettingsSchema.safeParse({ fontSize: size }).success).toBe(false);
    expect(updateProjectSettingsSchema.safeParse({ fontFamily: "Comic Sans" }).success).toBe(false);
    expect(updateProjectSettingsSchema.safeParse({ lineSpacing: "TRIPLE" }).success).toBe(false);
  });

  it("accepts the sizes at the edges, every listed font and every spacing", () => {
    for (const size of [10, 18]) expect(updateProjectSettingsSchema.safeParse({ fontSize: size }).success).toBe(true);
    expect(updateProjectSettingsSchema.safeParse({ fontFamily: "Courier Prime" }).success).toBe(true);
    for (const spacing of ["SINGLE", "ONE_AND_HALF", "DOUBLE"]) expect(updateProjectSettingsSchema.safeParse({ lineSpacing: spacing }).success).toBe(true);
  });
});
