import { describe, it, expect } from "vitest";
import { ACCENT_BACKGROUND, accentCss, contrastRatio, getAccentTokens } from "@/lib/accent";
import { COVER_COLORS } from "@/lib/project-config";

const EXTREMES = ["#000000", "#ffffff", "#0f172a", "#808080", "#ff0000", "#00ff00", "#0000ff", "#111111", "#ffff00", "#4c1d95"];

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
});

describe("getAccentTokens", () => {
  it.each([...COVER_COLORS, ...EXTREMES])("%s gives a readable primary on the dark background", (color) => {
    const t = getAccentTokens(color);
    expect(t).not.toBeNull();
    expect(contrastRatio(t!.primary, ACCENT_BACKGROUND)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([...COVER_COLORS, ...EXTREMES])("%s gives a foreground that is readable on the primary", (color) => {
    const t = getAccentTokens(color)!;
    expect(contrastRatio(t.primaryForeground, t.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a color that is already readable", () => {
    expect(getAccentTokens("#ff0000")!.primary).toBe("#ff0000");
  });

  it("lightens a near-black navy but keeps it blue", () => {
    const { primary } = getAccentTokens("#0f172a")!;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(primary.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
    expect(primary).not.toBe("#0f172a");
  });

  it("uses the primary as the ring color", () => {
    const t = getAccentTokens("#7f1d1d")!;
    expect(t.ring).toBe(t.primary);
  });

  it("returns null for anything that is not a #rrggbb color", () => {
    for (const bad of ["", "red", "#fff", "#12345", "#1234567", "#gggggg", "rgb(1,2,3)", "javascript:alert(1)"]) {
      expect(getAccentTokens(bad)).toBeNull();
    }
  });
});

describe("accentCss", () => {
  it("sets the three tokens on the dark root, using plain hex values only", () => {
    const css = accentCss(getAccentTokens("#be185d")!);
    expect(css).toMatch(/^:root\.dark\{--primary:#[0-9a-f]{6};--primary-foreground:#[0-9a-f]{6};--ring:#[0-9a-f]{6}\}$/);
  });

  it("never contains anything but the validated hex values, whatever the input", () => {
    for (const color of [...COVER_COLORS, ...EXTREMES]) {
      expect(accentCss(getAccentTokens(color)!)).toMatch(/^:root\.dark\{[-a-z:#0-9;]+\}$/);
    }
  });
});
