import { describe, it, expect } from "vitest";
import { STORY_TEMPLATES, beatKeysOf, getStoryTemplate, lostBeatKeys } from "@/lib/story-templates";

describe("built-in story templates", () => {
  it("has unique template ids and unique beat keys inside each template", () => {
    expect(new Set(STORY_TEMPLATES.map((t) => t.id)).size).toBe(STORY_TEMPLATES.length);
    for (const t of STORY_TEMPLATES) expect(new Set(t.beats.map((b) => b.key)).size).toBe(t.beats.length);
  });

  it("has the documented beat counts", () => {
    expect(getStoryTemplate("heros-journey")?.beats).toHaveLength(12);
    expect(getStoryTemplate("save-the-cat")?.beats).toHaveLength(15);
    expect(getStoryTemplate("eight-sequence")?.beats).toHaveLength(8);
    expect(getStoryTemplate("romance")?.beats.map((b) => b.key)).toEqual(["meet", "barrier", "black-moment", "resolution"]);
  });

  it("includes Fantasy and Sci-Fi genre notes", () => {
    expect(STORY_TEMPLATES.filter((t) => t.kind === "genre").map((t) => t.id)).toEqual(["fantasy-notes", "scifi-notes"]);
  });

  it("knows no template for null or an unknown id", () => {
    expect(getStoryTemplate(null)).toBeNull();
    expect(getStoryTemplate("nope")).toBeNull();
    expect(beatKeysOf(null).size).toBe(0);
  });
});

describe("lostBeatKeys", () => {
  it("lists old beats the new template lacks, so shared keys keep their progress", () => {
    const lost = lostBeatKeys("three-act", "save-the-cat");
    expect(lost).not.toContain("midpoint");
    expect(lost).not.toContain("all-is-lost");
    expect(lost).toContain("rising-action");
  });

  it("loses everything when the structure is cleared and nothing when there was none", () => {
    expect(lostBeatKeys("romance", null)).toHaveLength(4);
    expect(lostBeatKeys(null, "romance")).toEqual([]);
    expect(lostBeatKeys("romance", "romance")).toEqual([]);
  });
});
