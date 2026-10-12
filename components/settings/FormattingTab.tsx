"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon, MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FORMATTED_TEXT, fontCss, formattingStyle } from "@/lib/formatting";
import {
  FONTS,
  FONT_GROUPS,
  LINE_SPACING_OPTIONS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  type LineSpacing,
} from "@/lib/project-config";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";

const SAMPLE =
  "The rain had stopped by the time she reached the harbour, and the lamps along the quay flickered on one by one. Somewhere behind her a door closed, softly, as if it did not want to be heard. She stood for a long moment with her hand on the cold rail, listening to the water move against the stones, and then she began to walk.";
/** A paragraph needs enough lines for the spacing to show; a scene shorter than this is not used for the preview. */
const PREVIEW_LENGTH = 420;
const MIN_SCENE_PREVIEW = 260;
/** Typefaces differ a lot in x-height at one font size; the list evens them out so the names read alike. The preview keeps true sizes. */
const LIST_X_HEIGHT = 0.5;

const optionClass =
  "flex cursor-pointer items-center justify-center rounded-lg border border-input text-sm transition-colors hover:bg-muted has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50";
const selectedClass = "border-primary bg-muted ring-1 ring-primary";

/** Font, size and spacing sit together above the preview, so a change and its effect are on screen at once. */
export function FormattingTab() {
  const draft = useSettingsStore((s) => s.draft);
  const updateDraft = useSettingsStore((s) => s.updateDraft);
  const editor = useEditorStore((s) => s.editor);
  // What the writer is typing in the size box; the draft only takes whole sizes in range.
  const [sizeText, setSizeText] = useState<string | null>(null);
  // The open scene's opening lines when it has enough text to fill a paragraph, else a sample. Read once per opening of the tab.
  const [sample] = useState(() => {
    const text = editor?.getText().trim().replace(/\s+/g, " ") ?? "";
    return text.length >= MIN_SCENE_PREVIEW ? text.slice(0, PREVIEW_LENGTH) : SAMPLE;
  });
  if (!draft) return null;

  function setSize(next: number) {
    updateDraft({ fontSize: Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, next)) });
    setSizeText(null);
  }

  function onSizeChange(text: string) {
    setSizeText(text);
    const n = Number(text);
    if (text.trim() !== "" && Number.isInteger(n) && n >= MIN_FONT_SIZE && n <= MAX_FONT_SIZE) updateDraft({ fontSize: n });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label id="settings-font-label">Font</Label>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button type="button" variant="outline" aria-labelledby="settings-font-label settings-font-value" className="w-full justify-between" />}
          >
            <span id="settings-font-value" style={{ fontFamily: fontCss(draft.fontFamily) }}>
              {draft.fontFamily}
            </span>
            <ChevronDownIcon aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-72 w-64 overflow-y-auto">
            {FONT_GROUPS.map((group, index) => (
              <DropdownMenuGroup key={group}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{group}</DropdownMenuLabel>
                {FONTS.filter((f) => f.group === group).map((f) => (
                  <DropdownMenuItem
                    key={f.name}
                    aria-current={draft.fontFamily === f.name ? "true" : undefined}
                    onClick={() => updateDraft({ fontFamily: f.name })}
                  >
                    <span className="flex-1" style={{ fontFamily: fontCss(f.name), fontSizeAdjust: LIST_X_HEIGHT }}>
                      {f.name}
                    </span>
                    <CheckIcon className={cn("size-4", draft.fontFamily !== f.name && "invisible")} aria-hidden />
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="settings-font-size">Font size (pt, {MIN_FONT_SIZE} to {MAX_FONT_SIZE})</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Smaller"
              disabled={draft.fontSize <= MIN_FONT_SIZE}
              onClick={() => setSize(draft.fontSize - 1)}
            >
              <MinusIcon />
            </Button>
            <Input
              id="settings-font-size"
              type="number"
              inputMode="numeric"
              min={MIN_FONT_SIZE}
              max={MAX_FONT_SIZE}
              step={1}
              value={sizeText ?? String(draft.fontSize)}
              onChange={(e) => onSizeChange(e.target.value)}
              onBlur={() => setSizeText(null)}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Larger"
              disabled={draft.fontSize >= MAX_FONT_SIZE}
              onClick={() => setSize(draft.fontSize + 1)}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Line spacing</legend>
          <div className="grid grid-cols-3 gap-2">
            {LINE_SPACING_OPTIONS.map(({ value, label }) => (
              <label key={value} className={cn(optionClass, "h-8 px-2", draft.lineSpacing === value && selectedClass)}>
                <input
                  type="radio"
                  name="settings-line-spacing"
                  value={value}
                  checked={draft.lineSpacing === value}
                  onChange={() => updateDraft({ lineSpacing: value as LineSpacing })}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium" id="settings-preview-label">
          Preview
        </p>
        <div
          role="group"
          aria-labelledby="settings-preview-label"
          style={formattingStyle(draft)}
          className={cn("max-h-72 overflow-y-auto rounded-md border bg-card/30 px-3 py-2", FORMATTED_TEXT)}
        >
          <p>{sample}</p>
        </div>
      </div>
    </div>
  );
}
