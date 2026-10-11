import { describe, expect, it } from "vitest";
import { applySynonym, splitWord, wordRangeAt } from "@/lib/synonym";

describe("applySynonym", () => {
  it("replaces a plain word", () => {
    expect(applySynonym("happy", "glad")).toBe("glad");
  });

  it("keeps the capital of the first letter", () => {
    expect(applySynonym("Happy", "glad")).toBe("Glad");
    expect(applySynonym("happy", "Glad")).toBe("Glad");
  });

  it("does not capitalise a lowercase word, digits or empty input", () => {
    expect(applySynonym("2nd", "second")).toBe("second");
    expect(applySynonym("", "glad")).toBe("glad");
  });

  it("keeps punctuation around the word", () => {
    expect(applySynonym("Happy,", "glad")).toBe("Glad,");
    expect(applySynonym('"happy!"', "glad")).toBe('"glad!"');
    expect(applySynonym("(happy)", "glad")).toBe("(glad)");
  });
});

describe("splitWord", () => {
  it("separates the word from surrounding punctuation", () => {
    expect(splitWord('"Don\'t!"')).toEqual({ before: '"', word: "Don't", after: '!"' });
  });
});

describe("wordRangeAt", () => {
  const text = "She felt happy, truly.";

  it("finds the word under or beside the cursor", () => {
    expect(wordRangeAt(text, 11)).toEqual({ from: 9, to: 14 });
    expect(wordRangeAt(text, 9)).toEqual({ from: 9, to: 14 });
    expect(wordRangeAt(text, 14)).toEqual({ from: 9, to: 14 });
  });

  it("returns null between words and in empty text", () => {
    expect(wordRangeAt("a  b", 2)).toBeNull();
    expect(wordRangeAt("", 0)).toBeNull();
  });
});
