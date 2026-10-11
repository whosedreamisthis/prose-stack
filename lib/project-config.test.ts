import { describe, it, expect } from "vitest";
import { createProjectSchema, formatEditedDate, getContrastColor, projectIdSchema } from "@/lib/project-config";

const valid = { title: "My Book", subtitle: "", author: "Ada", coverDesign: "classic", coverColor: "#1e3a5f" };

describe("createProjectSchema", () => {
  it("accepts valid input and trims whitespace", () => {
    const result = createProjectSchema.parse({ ...valid, title: "  My Book  " });
    expect(result.title).toBe("My Book");
  });

  it("defaults a missing subtitle to an empty string", () => {
    const withoutSubtitle = { title: "My Book", author: "Ada", coverDesign: "classic", coverColor: "#1e3a5f" };
    expect(createProjectSchema.parse(withoutSubtitle).subtitle).toBe("");
  });

  it("requires a title and an author", () => {
    expect(createProjectSchema.safeParse({ ...valid, title: "   " }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...valid, author: "" }).success).toBe(false);
  });

  it("enforces length limits", () => {
    expect(createProjectSchema.safeParse({ ...valid, title: "x".repeat(121) }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...valid, subtitle: "x".repeat(161) }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...valid, author: "x".repeat(81) }).success).toBe(false);
  });

  it("rejects an unknown cover design or a malformed color", () => {
    expect(createProjectSchema.safeParse({ ...valid, coverDesign: "gothic" }).success).toBe(false);
    expect(createProjectSchema.safeParse({ ...valid, coverColor: "red" }).success).toBe(false);
  });
});

describe("getContrastColor", () => {
  it("picks white on dark backgrounds and near-black on light ones", () => {
    expect(getContrastColor("#1e3a5f")).toBe("#ffffff");
    expect(getContrastColor("#ffffff")).toBe("#111111");
  });
});

describe("formatEditedDate", () => {
  it("formats in UTC so server and browser render the same text", () => {
    expect(formatEditedDate(new Date("2026-10-11T23:30:00Z"))).toBe("Oct 11, 2026");
    expect(formatEditedDate(new Date("2026-10-11T00:30:00Z"))).toBe("Oct 11, 2026");
  });
});

describe("projectIdSchema", () => {
  it("accepts ordinary ids and rejects empty or oversized ones", () => {
    expect(projectIdSchema.safeParse("cmv3ady0g000006l085443i1o").success).toBe(true);
    expect(projectIdSchema.safeParse("").success).toBe(false);
    expect(projectIdSchema.safeParse("x".repeat(65)).success).toBe(false);
  });
});
