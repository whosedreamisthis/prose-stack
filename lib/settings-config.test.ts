import { describe, it, expect } from "vitest";
import {
  getChanges,
  getDirtyTabs,
  hasChanges,
  resetTab,
  updateProjectSettingsSchema,
  type SettingsValues,
} from "@/lib/settings-config";

const saved: SettingsValues = { title: "Book", subtitle: "", author: "Ann", theme: null };

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

describe("getDirtyTabs", () => {
  it("marks the tab that has edits", () => {
    expect(getDirtyTabs(saved, { ...saved, title: "New" })).toEqual({ general: true, appearance: false });
    expect(getDirtyTabs(saved, { ...saved, theme: "LIGHT" })).toEqual({ general: false, appearance: true });
  });
});

describe("resetTab", () => {
  it("clears the theme on Appearance and leaves other edits alone", () => {
    const draft = { ...saved, title: "Edited", theme: "DARK" as const };
    expect(resetTab(draft, "appearance")).toEqual({ ...draft, theme: null });
    expect(resetTab(draft, "general")).toEqual(draft);
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
});
