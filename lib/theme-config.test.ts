import { describe, it, expect } from "vitest";
import { THEME_SCRIPT, resolveTheme, themeSchema } from "@/lib/theme-config";

describe("resolveTheme", () => {
  it("uses the choice when there is one, whatever the system prefers", () => {
    expect(resolveTheme("LIGHT", true)).toBe("light");
    expect(resolveTheme("DARK", false)).toBe("dark");
  });

  it("follows the system preference when unchosen", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
  });
});

describe("themeSchema", () => {
  it("accepts light, dark or no choice, and nothing else", () => {
    for (const ok of ["LIGHT", "DARK", null]) expect(themeSchema.safeParse(ok).success).toBe(true);
    for (const bad of ["light", "SYSTEM", "", undefined]) expect(themeSchema.safeParse(bad).success).toBe(false);
  });
});

describe("THEME_SCRIPT", () => {
  function run(cookie: string, systemDark: boolean) {
    const classes = new Set<string>();
    const document = {
      cookie,
      documentElement: { classList: { toggle: (c: string, on: boolean) => (on ? classes.add(c) : classes.delete(c)) } },
    };
    const window = { matchMedia: () => ({ matches: systemDark }) };
    new Function("document", "window", THEME_SCRIPT)(document, window);
    return classes.has("dark");
  }

  it("lets the cookie win over the system preference", () => {
    expect(run("a=1; theme=light", true)).toBe(false);
    expect(run("theme=dark", false)).toBe(true);
  });

  it("follows the system preference without a cookie, and ignores a bad cookie value", () => {
    expect(run("", true)).toBe(true);
    expect(run("", false)).toBe(false);
    expect(run("theme=purple", false)).toBe(false);
  });
});
