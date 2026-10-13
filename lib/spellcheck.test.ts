import { describe, expect, it } from "vitest";
import { findWords, matchCase, normalizeWord, rankSuggestions, shouldSkip } from "@/lib/spellcheck";

describe("findWords", () => {
  it("returns each word with its offsets", () => {
    expect(findWords("The cat sat.")).toEqual([
      { from: 0, to: 3, word: "The" },
      { from: 4, to: 7, word: "cat" },
      { from: 8, to: 11, word: "sat" },
    ]);
  });

  it("keeps apostrophes inside a word, straight or curly", () => {
    expect(findWords("don't writer’s 'quoted'").map((w) => w.word)).toEqual(["don't", "writer’s", "quoted"]);
  });

  it("splits hyphenated words and ignores numbers", () => {
    expect(findWords("well-known 1984 café").map((w) => w.word)).toEqual(["well", "known", "café"]);
  });

  it("returns nothing for text without letters", () => {
    expect(findWords("12 — 34 …")).toEqual([]);
  });
});

describe("shouldSkip", () => {
  it("skips single letters and ALL CAPS words", () => {
    expect(shouldSkip("a")).toBe(true);
    expect(shouldSkip("NASA")).toBe(true);
  });

  it("checks ordinary and capitalised words", () => {
    expect(shouldSkip("teh")).toBe(false);
    expect(shouldSkip("Teh")).toBe(false);
  });
});

describe("normalizeWord", () => {
  it("straightens curly apostrophes", () => {
    expect(normalizeWord("don’t")).toBe("don't");
  });
});

describe("matchCase", () => {
  it("capitalises the suggestion when the original was capitalised", () => {
    expect(matchCase("Teh", "the")).toBe("The");
  });

  it("leaves the suggestion alone for lowercase or mixed-case originals", () => {
    expect(matchCase("teh", "the")).toBe("the");
    expect(matchCase("iPhoen", "iPhone")).toBe("iPhone");
  });
});

describe("rankSuggestions", () => {
  const dont = ["Cont", "Dent", "Dint", "Done", "Dong", "Font", "Dolt", "Don", "Don't", "Dona"];

  it("puts the word with its apostrophe restored first, and keeps the rest in order", () => {
    const ranked = rankSuggestions("Dont", dont);
    expect(ranked[0]).toBe("Don't");
    expect(ranked.slice(1)).toEqual(dont.filter((s) => s !== "Don't"));
  });

  it("recognises it with a curly apostrophe or different case in the input", () => {
    expect(rankSuggestions("DONT", ["Done", "Don't"])[0]).toBe("Don't");
    expect(rankSuggestions("didnt", ["didst", "didn't"])[0]).toBe("didn't");
  });

  it("leaves the order alone when no suggestion only adds an apostrophe", () => {
    expect(rankSuggestions("teh", ["the", "tech", "ten"])).toEqual(["the", "tech", "ten"]);
  });
});
