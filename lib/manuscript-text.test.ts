import { describe, it, expect } from "vitest";
import { chunkText, countDocWords, countWords, docFromText, extractText } from "@/lib/manuscript-text";

describe("countWords", () => {
  it("counts whitespace-separated words", () => {
    expect(countWords("Once upon a time...")).toBe(4);
    expect(countWords("  ")).toBe(0);
    expect(countWords("one\ntwo\tthree")).toBe(3);
  });
});

describe("countDocWords", () => {
  it("does not merge words across paragraphs", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "end" }] },
        { type: "paragraph", content: [{ type: "text", text: "start" }] },
      ],
    };
    expect(extractText(doc)).toBe("end\nstart\n");
    expect(countDocWords(doc)).toBe(2);
  });

  it("counts an empty or missing document as zero", () => {
    expect(countDocWords(null)).toBe(0);
    expect(countDocWords({ type: "doc", content: [{ type: "paragraph" }] })).toBe(0);
  });

  it("reads documents built by docFromText", () => {
    expect(countDocWords(docFromText("Once upon a time..."))).toBe(4);
  });
});

describe("chunkText", () => {
  it("splits on sentences and keeps each chunk under the limit when it can", () => {
    const text = "One short sentence. Another one here! And a third? Yes.";
    const chunks = chunkText(text, 25);
    expect(chunks.join(" ")).toBe(text);
    expect(chunks.every((c) => c.length <= 30)).toBe(true);
  });

  it("returns nothing for blank text", () => {
    expect(chunkText("  \n ")).toEqual([]);
  });

  it("keeps text with no sentence punctuation", () => {
    expect(chunkText("no punctuation here")).toEqual(["no punctuation here"]);
  });
});
