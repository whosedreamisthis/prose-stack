import { describe, it, expect } from "vitest";
import {
  LABEL_PRESETS,
  contrastRatio,
  createLabelSchema,
  isLowContrast,
  labelColorSchema,
  labelNameKey,
  labelNameSchema,
} from "@/lib/label-config";

describe("labelNameSchema", () => {
  it("trims, and needs 1 to 40 characters", () => {
    expect(labelNameSchema.parse("  Draft ")).toBe("Draft");
    expect(labelNameSchema.safeParse("   ").success).toBe(false);
    expect(labelNameSchema.safeParse("x".repeat(40)).success).toBe(true);
    expect(labelNameSchema.safeParse("x".repeat(41)).success).toBe(false);
  });

  it("compares names ignoring case and surrounding space", () => {
    expect(labelNameKey("  Draft ")).toBe(labelNameKey("DRAFT"));
    expect(labelNameKey("Draft")).not.toBe(labelNameKey("Drafts"));
  });
});

describe("labelColorSchema", () => {
  it("accepts #rrggbb and lower-cases it", () => {
    expect(labelColorSchema.parse("#1A2B3C")).toBe("#1a2b3c");
  });

  it("rejects anything else", () => {
    for (const bad of ["red", "#fff", "#12345g", "1a2b3c", "#1a2b3c4d", ""]) expect(labelColorSchema.safeParse(bad).success).toBe(false);
  });
});

describe("createLabelSchema", () => {
  it("needs a valid name and color, and a well-formed client id when given", () => {
    const ok = { projectId: "p1", name: "Final", color: "#16a34a" };
    expect(createLabelSchema.safeParse(ok).success).toBe(true);
    expect(createLabelSchema.safeParse({ ...ok, id: "client-id-1" }).success).toBe(true);
    expect(createLabelSchema.safeParse({ ...ok, id: "bad id!" }).success).toBe(false);
    expect(createLabelSchema.safeParse({ ...ok, name: " " }).success).toBe(false);
    expect(createLabelSchema.safeParse({ ...ok, color: "green" }).success).toBe(false);
  });
});

describe("contrast", () => {
  it("is 21 between black and white and 1 for a color against itself", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#336699", "#336699")).toBeCloseTo(1, 5);
  });

  it("warns for colors near the light or the dark page, not for the presets", () => {
    expect(isLowContrast("#ffffff")).toBe(true);
    expect(isLowContrast("#f5f5f5")).toBe(true);
    expect(isLowContrast("#2b2b2b")).toBe(true);
    expect(isLowContrast("#303030")).toBe(true);
    for (const preset of LABEL_PRESETS) expect(isLowContrast(preset.color)).toBe(false);
  });
});
