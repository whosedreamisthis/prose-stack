import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/read-aloud";

describe("chunkText", () => {
  it("returns nothing for blank text", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("  \n\n ")).toEqual([]);
  });

  it("keeps a short paragraph as one chunk", () => {
    expect(chunkText("It was late. She waited.")).toEqual(["It was late. She waited."]);
  });

  it("never joins sentences across paragraphs", () => {
    expect(chunkText("First paragraph.\nSecond paragraph.")).toEqual(["First paragraph.", "Second paragraph."]);
  });

  it("packs sentences up to the limit and starts a new chunk after it", () => {
    expect(chunkText("One two. Three four. Five six.", 20)).toEqual(["One two. Three four.", "Five six."]);
  });

  it("keeps closing quotes with their sentence", () => {
    expect(chunkText('"Go now!" she said. He left.', 12)).toEqual(['"Go now!"', "she said.", "He left."]);
  });

  it("breaks a sentence longer than the limit at spaces, without splitting words", () => {
    const chunks = chunkText("alpha beta gamma delta epsilon zeta", 12);
    expect(chunks).toEqual(["alpha beta", "gamma delta", "epsilon zeta"]);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(12);
  });

  it("reads text that has no final punctuation", () => {
    expect(chunkText("No ending here")).toEqual(["No ending here"]);
  });

  it("splits a very long scene into many bounded chunks", () => {
    const text = Array.from({ length: 3000 }, (_, i) => `Sentence number ${i}.`).join(" ");
    const chunks = chunkText(text);
    expect(chunks.length).toBeGreaterThan(100);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
  });
});
