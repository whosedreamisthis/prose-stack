"use client";

import { useLayoutEffect } from "react";
import { applyTheme, persistThemeCookie, type ThemeChoice } from "@/lib/theme-config";

/**
 * Brings <html> and the first-paint cookie in line with the theme saved on the user. On the device that saved it the
 * head script has already done this, so nothing changes; on a new device or after switching accounts it corrects the
 * page. It also re-applies the class after React's dev-only remount clears it.
 */
export function ThemeSync({ theme }: { theme: ThemeChoice | null }) {
  useLayoutEffect(() => {
    persistThemeCookie(theme);
    applyTheme(theme);
  }, [theme]);
  return null;
}
