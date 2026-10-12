import { z } from "zod";

/** Mirrors the `Theme` enum in the schema. `null` means the writer has not chosen, so the system preference applies. */
export const THEMES = ["LIGHT", "DARK"] as const;
export type ThemeChoice = (typeof THEMES)[number];
export const themeSchema = z.enum(THEMES).nullable();

export type ResolvedTheme = "light" | "dark";

/** The cookie that carries the choice to the first paint. It only mirrors `User.theme`; the database is the source of truth. */
export const THEME_COOKIE = "theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** An unchosen theme follows the system preference; where that cannot be known, it is light. */
export function resolveTheme(choice: ThemeChoice | null, systemDark: boolean): ResolvedTheme {
  if (choice) return choice === "DARK" ? "dark" : "light";
  return systemDark ? "dark" : "light";
}

/**
 * Runs in <head> while the HTML is parsed, so the right class is on <html> before the first paint. It reads the cookie,
 * falls back to the system preference, and ends up light if neither is available. Keep it in step with `resolveTheme`.
 */
export const THEME_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/);var d=m?m[1]==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;

/** Puts the theme on <html> now. Browser only. */
export function applyTheme(choice: ThemeChoice | null) {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", resolveTheme(choice, systemDark) === "dark");
}

/** Remembers the choice for the next first paint (or forgets it, when unchosen). Browser only. */
export function persistThemeCookie(choice: ThemeChoice | null) {
  document.cookie = choice
    ? `${THEME_COOKIE}=${choice.toLowerCase()}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
    : `${THEME_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
