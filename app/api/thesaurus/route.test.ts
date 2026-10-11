import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/thesaurus/route";
import { MAX_SYNONYMS, MAX_THESAURUS_WORD_LENGTH, fetchSynonyms, parseThesaurusWord } from "@/lib/thesaurus";

const request = (query: string) => new Request(`http://localhost/api/thesaurus${query}`);
const datamuse = (words: string[]) =>
  new Response(JSON.stringify(words.map((word, i) => ({ word, score: 100 - i }))), { status: 200 });

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("parseThesaurusWord", () => {
  it("accepts words, apostrophes and hyphens", () => {
    expect(parseThesaurusWord(" happy ")).toBe("happy");
    expect(parseThesaurusWord("well-known")).toBe("well-known");
    expect(parseThesaurusWord("don't")).toBe("don't");
  });

  it("rejects missing, empty, over-long and unsafe input", () => {
    expect(parseThesaurusWord(null)).toBeNull();
    expect(parseThesaurusWord("  ")).toBeNull();
    expect(parseThesaurusWord("a".repeat(MAX_THESAURUS_WORD_LENGTH + 1))).toBeNull();
    expect(parseThesaurusWord("two words")).toBeNull();
    expect(parseThesaurusWord("happy&max=1000")).toBeNull();
    expect(parseThesaurusWord("123")).toBeNull();
  });
});

describe("fetchSynonyms", () => {
  it("returns the words, without the word itself, capped at the limit", async () => {
    const many = Array.from({ length: 40 }, (_, i) => `word${i}`);
    const fetchImpl = vi.fn().mockResolvedValue(datamuse(["Happy", ...many]));
    const words = await fetchSynonyms("happy", fetchImpl);
    expect(words).toHaveLength(MAX_SYNONYMS);
    expect(words).not.toContain("Happy");
    expect(fetchImpl.mock.calls[0][0]).toContain("rel_syn=happy");
  });

  it("throws when the upstream fails or answers oddly", async () => {
    await expect(fetchSynonyms("happy", vi.fn().mockResolvedValue(new Response("", { status: 500 })))).rejects.toThrow();
    await expect(fetchSynonyms("happy", vi.fn().mockResolvedValue(new Response("{}", { status: 200 })))).rejects.toThrow();
  });
});

describe("GET /api/thesaurus", () => {
  it("rejects a missing or invalid word with 400", async () => {
    expect((await GET(request(""))).status).toBe(400);
    expect((await GET(request("?word=two%20words"))).status).toBe(400);
    expect((await GET(request(`?word=${"a".repeat(41)}`))).status).toBe(400);
  });

  it("returns the synonyms", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(datamuse(["glad", "joyful"])));
    const response = await GET(request("?word=happy"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ words: ["glad", "joyful"] });
  });

  it("answers 502 with a clear message when Datamuse fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await GET(request("?word=happy"));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Couldn't reach the thesaurus." });
  });
});
