"use client";

import type { CSSProperties } from "react";
import { COVER_COLORS } from "@/lib/project-config";
import { cn } from "@/lib/utils";

interface CoverColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const SWATCH = "size-7 rounded-full border border-border bg-(--swatch) ring-offset-2 ring-offset-background";

/** Preset cover color swatches plus a round custom swatch that opens the native color picker. */
export function CoverColorPicker({ value, onChange }: CoverColorPickerProps) {
  const isCustom = !COVER_COLORS.some((color) => color === value);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {COVER_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`Cover color ${color}`}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          className={cn(SWATCH, value === color && "ring-2 ring-ring")}
          style={{ "--swatch": color } as CSSProperties}
        />
      ))}
      <label
        className={cn(
          SWATCH,
          "relative cursor-pointer overflow-hidden focus-within:ring-2 focus-within:ring-ring",
          isCustom && "ring-2 ring-ring",
        )}
        style={{ "--swatch": isCustom ? value : "transparent" } as CSSProperties}
      >
        {!isCustom && <span aria-hidden className="absolute inset-0 bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" />}
        <input
          type="color"
          aria-label="Custom cover color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
