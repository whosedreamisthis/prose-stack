import { describe, expect, it } from "vitest";
import { checkBlocks, editDistance, nameTokens, type CheckOptions } from "@/lib/proofread/check";
import { ALL_CATEGORIES } from "@/lib/proofread/config";
import { dialogueSpans, dominantQuoteStyle, quoteMismatches } from "@/lib/proofread/quotes";

const options = (over: Partial<CheckOptions> = {}): CheckOptions => ({
  categories: ALL_CATEGORIES,
  names: [],
  ignore: [],
  quotes: null,
  ...over,
});

const rules = (found: { rule: string }[]) => found.map((s) => s.rule);

describe("checkBlocks: usage", () => {
  it("flags a repeated word and offers to remove one", async () => {
    const text = "She walked to the the door.";
    const [found] = await checkBlocks([text], options());
    expect(found).toMatchObject({ rule: "repeated-word", category: "usage", replacement: "the" });
    expect(text.slice(found.from, found.to)).toBe("the the");
    expect(found.text).toBe("the the");
  });

  it("flags a wrong a/an on just the article", async () => {
    const text = "He saw a hour pass.";
    const [found] = await checkBlocks([text], options());
    expect(found).toMatchObject({ rule: "article", replacement: "an", text: "a" });
  });

  it("flags a missing apostrophe, with a straight one unless the scene uses curly quotes", async () => {
    const [straight] = await checkBlocks(["Dont go."], options());
    expect(straight).toMatchObject({ rule: "apostrophe", replacement: "Don't" });
    const [curly] = await checkBlocks(["Dont go."], options({ quotes: "curly" }));
    expect(curly.replacement).toBe("Don’t");
  });

  it("flags two or more spaces in a row, and offers one", async () => {
    const text = "She opened the door.  It was cold.";
    const [found] = await checkBlocks([text], options());
    expect(found).toMatchObject({ rule: "double-space", category: "usage", replacement: " ", text: "  " });
    expect(text.slice(found.from, found.to)).toBe("  ");
    const [three] = await checkBlocks(["Too   many."], options());
    expect(three).toMatchObject({ rule: "double-space", text: "   " });
  });

  it("leaves a single space, indentation and a line break alone", async () => {
    expect(rules(await checkBlocks(["One space only.", "   Indented start.", "Line\n break."], options()))).not.toContain("double-space");
  });

  it("does not run the usage rules when that category is off", async () => {
    const found = await checkBlocks(["the the door"], options({ categories: ["style"] }));
    expect(found).toEqual([]);
  });
});

describe("checkBlocks: style", () => {
  it("flags an irregular passive but leaves it alone inside dialogue", async () => {
    expect(rules(await checkBlocks(["The ball was thrown by him."], options()))).toContain("passive");
    expect(rules(await checkBlocks(['"The ball was thrown by him," she said.'], options()))).not.toContain("passive");
  });

  it("offers to drop a filler word with the space after it, but not at the start of a sentence", async () => {
    const mid = "It was really cold.";
    const [a] = await checkBlocks([mid], options());
    expect(a).toMatchObject({ rule: "filler", replacement: "" });
    expect(mid.slice(a.from, a.to)).toBe("really ");
    const [b] = await checkBlocks(["Just then the door opened."], options());
    expect(b).toMatchObject({ rule: "filler", replacement: null });
  });

  it("flags a sentence over the word limit, with no replacement", async () => {
    const long = `${"word ".repeat(50).trim()}.`;
    const found = await checkBlocks([`Short one. ${long}`], options());
    const sentence = found.find((s) => s.rule === "long-sentence");
    expect(sentence?.replacement).toBeNull();
    expect(sentence?.text).toBe(long);
  });

  it("leaves a long spoken sentence alone", async () => {
    const long = `"${"word ".repeat(50).trim()}."`;
    expect(rules(await checkBlocks([long], options()))).not.toContain("long-sentence");
  });
});

describe("checkBlocks: consistency", () => {
  it("flags a name spelled one letter off, from the project's names", async () => {
    const found = await checkBlocks(["Edrik came to dinner."], options({ names: ["Edric Vane"] }));
    expect(found[0]).toMatchObject({ rule: "name-variant", category: "consistency", replacement: "Edric", text: "Edrik" });
  });

  it("does not flag the correct name, or a short name's lookalikes", async () => {
    expect(await checkBlocks(["Edric came."], options({ names: ["Edric Vane"] }))).toEqual([]);
    expect(await checkBlocks(["Mark came."], options({ names: ["Mara Quill"] }))).toEqual([]);
  });

  it("flags quotes in the minority style, with the right opening and closing mark", async () => {
    const found = await checkBlocks(['She said "hello" to “them”.'], options({ quotes: "curly" }));
    expect(found.map((s) => s.replacement)).toEqual(["“", "”"]);
    expect(found.every((s) => s.rule === "quotes")).toBe(true);
  });

  it("does not flag quotes when the scene is consistent", async () => {
    expect(rules(await checkBlocks(['She said "hello".'], options({ quotes: null })))).not.toContain("quotes");
  });
});

describe("checkBlocks: ignore list and results", () => {
  it("drops suggestions for ignored words and rules", async () => {
    const text = "It was really cold. He saw the the door.";
    const word = await checkBlocks([text], options({ ignore: [{ kind: "WORD", value: "really" }] }));
    expect(rules(word)).not.toContain("filler");
    expect(rules(word)).toContain("repeated-word");
    const rule = await checkBlocks([text], options({ ignore: [{ kind: "RULE", value: "passive" }, { kind: "WORD", value: "the" }] }));
    expect(rules(rule)).not.toContain("repeated-word");
  });

  it("reports offsets into each paragraph, in reading order", async () => {
    const found = await checkBlocks(["Fine.", "Very odd."], options());
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ block: 1, from: 0 });
  });

  it("returns nothing for empty and clean text", async () => {
    expect(await checkBlocks(["", "   ", "The lamp was lit."], options())).toEqual([]);
  });
});

describe("helpers", () => {
  it("counts a swap as one edit", () => {
    expect(editDistance("Edric", "Edrci")).toBe(1);
    expect(editDistance("Edric", "Edrik")).toBe(1);
    expect(editDistance("Edric", "Marta")).toBeGreaterThan(1);
  });

  it("keeps only name parts long enough to compare", () => {
    expect(nameTokens(["Mara Quill", "Edric Vane", "The Lighthouse"])).toEqual(["Quill", "Edric", "Lighthouse"]);
  });

  it("finds the dominant quote style only when both appear", () => {
    expect(dominantQuoteStyle(['"a"', '"b"'])).toBeNull();
    expect(dominantQuoteStyle(['"a"', "“b”", "“c”"])).toBe("curly");
    expect(dominantQuoteStyle(['"a" "b" "c"', "“b”"])).toBe("straight");
  });

  it("finds spoken ranges, including a quote left open", () => {
    expect(dialogueSpans('He said "go" and left.')).toEqual([[8, 12]]);
    expect(dialogueSpans('"Open')).toEqual([[0, 5]]);
    expect(quoteMismatches('"a"', "curly").map((m) => m.replacement)).toEqual(["“", "”"]);
  });
});
