import { describe, it, expect } from "vitest";
import {
  buildSnippet,
  foldText,
  highlightText,
  parseSearchQuery,
  searchScenesSchema,
  textMatches,
  toTsQuery,
  toTsQueryAny,
} from "@/lib/scene-search";

describe("parseSearchQuery", () => {
  it("turns each word into its own unit, lower-cased and without accents", () => {
    expect(parseSearchQuery("Café Light")).toEqual([[{ text: "cafe", prefix: false }], [{ text: "light", prefix: false }]]);
  });

  it("keeps a quoted phrase together", () => {
    const units = parseSearchQuery('storm "last ferry"');
    expect(units).toHaveLength(2);
    expect(units[1].map((w) => w.text)).toEqual(["last", "ferry"]);
  });

  it("treats a trailing star as a prefix on that word only", () => {
    expect(parseSearchQuery("light* house")).toEqual([[{ text: "light", prefix: true }], [{ text: "house", prefix: false }]]);
  });

  it("treats an unfinished quote as a phrase to the end", () => {
    expect(parseSearchQuery('"last fer')[0].map((w) => w.text)).toEqual(["last", "fer"]);
  });

  it("drops everything that could be query syntax", () => {
    expect(toTsQuery(parseSearchQuery("a & b | c:* ! ( ) <-> ' \\ ; --"))).toBe("(a) & (b) & (c)");
    expect(parseSearchQuery("& | ! :*")).toEqual([]);
  });

  it("caps very long input", () => {
    const units = parseSearchQuery(Array.from({ length: 50 }, (_, i) => `w${i}`).join(" "));
    expect(units.flat().length).toBeLessThanOrEqual(12);
  });
});

describe("toTsQuery", () => {
  it("ANDs units, chains phrase words with <-> and marks prefixes", () => {
    expect(toTsQuery(parseSearchQuery('storm "last ferry" light*'))).toBe("(storm) & (last <-> ferry) & (light:*)");
  });

  it("ORs the words for ranking", () => {
    expect(toTsQueryAny(parseSearchQuery('storm "last ferry"'))).toBe("storm | last | ferry");
  });
});

describe("searchScenesSchema", () => {
  it("trims and bounds the query", () => {
    expect(searchScenesSchema.safeParse({ projectId: "p1", query: "  ab  " }).data?.query).toBe("ab");
    expect(searchScenesSchema.safeParse({ projectId: "p1", query: "a" }).success).toBe(false);
    expect(searchScenesSchema.safeParse({ projectId: "p1", query: "x".repeat(101) }).success).toBe(false);
    expect(searchScenesSchema.safeParse({ projectId: "", query: "storm" }).success).toBe(false);
  });
});

describe("highlighting", () => {
  const units = parseSearchQuery("light");

  it("matches whole words only, ignoring case and accents", () => {
    expect(highlightText("The Light of the lighthouse", units).filter((p) => p.match).map((p) => p.text)).toEqual(["Light"]);
    expect(textMatches("Éclair", parseSearchQuery("eclair"))).toBe(true);
  });

  it("matches a prefix when asked", () => {
    expect(textMatches("lighthouse", parseSearchQuery("light*"))).toBe(true);
  });

  it("folds accents", () => {
    expect(foldText("Crème Brûlée")).toBe("creme brulee");
  });
});

describe("buildSnippet", () => {
  it("shows the stretch around the first match with ellipses", () => {
    const text = `${"word ".repeat(40)}lantern ${"more ".repeat(40)}`;
    const snippet = buildSnippet(text, parseSearchQuery("lantern"));
    expect(snippet.before).toBe(true);
    expect(snippet.after).toBe(true);
    expect(snippet.parts.some((p) => p.match && p.text === "lantern")).toBe(true);
    expect(snippet.parts.map((p) => p.text).join("").length).toBeLessThan(140);
  });

  it("falls back to the opening of the text when nothing in it matches", () => {
    const snippet = buildSnippet("A short scene about a ferry.", parseSearchQuery("revise"));
    expect(snippet.before).toBe(false);
    expect(snippet.parts.some((p) => p.match)).toBe(false);
    expect(snippet.parts.map((p) => p.text).join("")).toContain("A short scene");
  });
});
