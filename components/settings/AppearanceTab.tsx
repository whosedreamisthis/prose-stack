"use client";

import { MoonIcon, SunIcon, type LucideIcon } from "lucide-react";
import { useResolvedTheme } from "@/hooks/useResolvedTheme";
import { useSettingsStore } from "@/lib/stores/settings-store";
import type { ThemeChoice } from "@/lib/theme-config";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemeChoice; label: string; icon: LucideIcon }[] = [
  { value: "LIGHT", label: "Light", icon: SunIcon },
  { value: "DARK", label: "Dark", icon: MoonIcon },
];

export function AppearanceTab() {
  const draft = useSettingsStore((s) => s.draft);
  const updateDraft = useSettingsStore((s) => s.updateDraft);
  // The theme on <html> is the draft's, previewed live, so it is also what an unchosen theme resolved to.
  const shown = useResolvedTheme();
  if (!draft) return null;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium">Theme</legend>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-input p-4 text-sm transition-colors hover:bg-muted has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              shown === value.toLowerCase() && "border-primary bg-muted ring-1 ring-primary",
            )}
          >
            <input
              type="radio"
              name="settings-theme"
              value={value}
              checked={shown === value.toLowerCase()}
              onChange={() => updateDraft({ theme: value })}
              className="sr-only"
            />
            <Icon className="size-6" aria-hidden />
            {label}
          </label>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {draft.theme === null
          ? "Following your device's setting. Pick a theme to use it on every project instead."
          : "Used on every project, on every device you sign in on. Reset to default to follow your device's setting again."}
      </p>
    </fieldset>
  );
}
