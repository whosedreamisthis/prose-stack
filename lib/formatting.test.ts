import { describe, it, expect } from "vitest";
import { fontCss, formattingStyle, toFormatting } from "@/lib/formatting";
import { DEFAULT_FORMATTING, FONTS, FONT_NAMES, LINE_SPACING_OPTIONS, TOOLBAR_FONT_SIZES } from "@/lib/project-config";

describe("the font list", () => {
  it("has 12 fonts with unique names, including Courier Prime, and Georgia first", () => {
    expect(FONTS).toHaveLength(12);
    expect(new Set(FONT_NAMES).size).toBe(12);
    expect(FONT_NAMES).toContain("Courier Prime");
    expect(FONTS[0].name).toBe("Georgia");
  });

  it("gives the system fonts a PDF stand-in and every other font a self-hosted variable", () => {
    for (const f of FONTS) {
      if ("pdfFont" in f) expect(["Gelasio", "Tinos"]).toContain(f.pdfFont);
      else expect(f.css).toMatch(/^var\(--font-[a-z-]+\)/);
    }
  });

  it("has a default that is in the list, and toolbar sizes that are inside 10 to 18", () => {
    expect(FONT_NAMES).toContain(DEFAULT_FORMATTING.fontFamily);
    for (const size of TOOLBAR_FONT_SIZES) expect(size >= 10 && size <= 18).toBe(true);
  });
});

describe("toFormatting", () => {
  it("keeps valid values and falls back to the defaults for unknown fonts and spacings", () => {
    expect(toFormatting({ fontFamily: "Lora", fontSize: 14, lineSpacing: "SINGLE" })).toEqual({
      fontFamily: "Lora",
      fontSize: 14,
      lineSpacing: "SINGLE",
    });
    expect(toFormatting({ fontFamily: "Papyrus", fontSize: 14, lineSpacing: "TRIPLE" })).toEqual({
      fontFamily: "Georgia",
      fontSize: 14,
      lineSpacing: "DOUBLE",
    });
  });

  it("drops fields that are not formatting", () => {
    const result = toFormatting({ fontFamily: "Lora", fontSize: 12, lineSpacing: "DOUBLE", title: "x" } as never);
    expect(Object.keys(result).sort()).toEqual(["fontFamily", "fontSize", "lineSpacing"]);
  });
});

describe("formattingStyle", () => {
  it("sets the editor variables from the formatting", () => {
    const style = formattingStyle({ fontFamily: "Courier Prime", fontSize: 14, lineSpacing: "ONE_AND_HALF" }) as Record<string, string>;
    expect(style["--editor-font"]).toBe(fontCss("Courier Prime"));
    expect(style["--editor-size"]).toBe("14pt");
    expect(style["--editor-leading"]).toBe("1.5");
    expect(style["--editor-gap"]).toBe(LINE_SPACING_OPTIONS[1].paragraphGap);
  });

  it("gives single spacing a tighter leading than double", () => {
    const leading = (lineSpacing: "SINGLE" | "DOUBLE") =>
      Number((formattingStyle({ ...DEFAULT_FORMATTING, lineSpacing }) as Record<string, string>)["--editor-leading"]);
    expect(leading("SINGLE")).toBeLessThan(leading("DOUBLE"));
  });
});
