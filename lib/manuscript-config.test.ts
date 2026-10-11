import { describe, it, expect } from "vitest";
import { canParent, defaultNodeTitle } from "@/lib/manuscript-config";

describe("canParent", () => {
  it("lets the book hold parts and chapters but not scenes", () => {
    expect(canParent(null, "PART")).toBe(true);
    expect(canParent(null, "CHAPTER")).toBe(true);
    expect(canParent(null, "SCENE")).toBe(false);
  });

  it("lets parts hold only chapters", () => {
    expect(canParent("PART", "CHAPTER")).toBe(true);
    expect(canParent("PART", "SCENE")).toBe(false);
    expect(canParent("PART", "PART")).toBe(false);
  });

  it("lets chapters hold only scenes, and scenes hold nothing", () => {
    expect(canParent("CHAPTER", "SCENE")).toBe(true);
    expect(canParent("CHAPTER", "CHAPTER")).toBe(false);
    expect(canParent("SCENE", "SCENE")).toBe(false);
  });
});

describe("defaultNodeTitle", () => {
  it("numbers the new item after its existing siblings", () => {
    expect(defaultNodeTitle("CHAPTER", 0)).toBe("Chapter 1");
    expect(defaultNodeTitle("SCENE", 2)).toBe("Scene 3");
    expect(defaultNodeTitle("PART", 1)).toBe("Part 2");
  });
});
