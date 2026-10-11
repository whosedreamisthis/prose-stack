"use client";

import { useState, type KeyboardEvent } from "react";
import { useEditorState } from "@tiptap/react";
import { BookAIcon, CheckIcon, HeadphonesIcon, RedoIcon, SearchIcon, TypeIcon, UndoIcon, type LucideIcon } from "lucide-react";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useModKey } from "@/hooks/useModKey";
import { FONT_SIZES, useEditorStore } from "@/lib/stores/editor-store";
import { cn } from "@/lib/utils";

const toolClass = "aria-disabled:cursor-default aria-disabled:opacity-50 aria-pressed:bg-primary/15 aria-pressed:text-primary";

interface ToolButtonProps {
  label: string;
  shortcut?: string;
  icon: LucideIcon;
  enabled: boolean;
  onClick?: () => void;
  /** Roving tab stop: only one tool is reachable with Tab. */
  tabStop: boolean;
  pressed?: boolean;
}

/** A toolbar button. Disabled tools stay focusable (aria-disabled) so the arrow keys and tooltips still reach them. */
function ToolButton({ label, shortcut, icon: Icon, enabled, onClick, tabStop, pressed }: ToolButtonProps) {
  return (
    <Hint label={shortcut ? `${label} (${shortcut})` : label}>
      <Button
        variant="ghost"
        size="icon"
        data-tool
        tabIndex={tabStop ? 0 : -1}
        aria-label={label}
        aria-disabled={!enabled}
        aria-pressed={pressed}
        onClick={() => enabled && onClick?.()}
        className={toolClass}
      >
        <Icon className="size-5" />
      </Button>
    </Hint>
  );
}

/** The editor's tools. Rendered above the main pane (the `@toolbar` slot) and centered over it. */
export function EditorToolbar() {
  const mod = useModKey();
  const editor = useEditorStore((s) => s.editor);
  const findOpen = useEditorStore((s) => s.findOpen);
  const setFindOpen = useEditorStore((s) => s.setFindOpen);
  const setThesaurusOpen = useEditorStore((s) => s.setThesaurusOpen);
  const fontSize = useEditorStore((s) => s.fontSize);
  const setFontSize = useEditorStore((s) => s.setFontSize);
  const [stop, setStop] = useState(0);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  const { canUndo, canRedo } = useEditorState({
    editor,
    selector: ({ editor }) => ({ canUndo: !!editor?.can().undo(), canRedo: !!editor?.can().redo() }),
  }) ?? { canUndo: false, canRedo: false };
  const hasEditor = !!editor;

  // Arrow keys, Home and End move between tools; Tab leaves the toolbar.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    const tools = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-tool]"));
    const i = tools.indexOf(document.activeElement as HTMLElement);
    if (i === -1) return;
    const next =
      e.key === "Home" ? 0 : e.key === "End" ? tools.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + tools.length) % tools.length;
    tools[next]?.focus();
    e.preventDefault();
  }

  const tab = (i: number) => stop === i;

  return (
    <div
      role="toolbar"
      aria-label="Editor tools"
      onKeyDown={onKeyDown}
      onFocus={(e) => {
        const tools = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("[data-tool]"));
        const i = tools.indexOf(e.target as HTMLElement);
        if (i !== -1) setStop(i);
      }}
      className="flex items-center gap-1"
    >
      <ToolButton label="Undo" shortcut={`${mod}+Z`} icon={UndoIcon} enabled={hasEditor && canUndo} tabStop={tab(0)} onClick={() => editor?.chain().focus().undo().run()} />
      <ToolButton label="Redo" shortcut={`${mod}+Shift+Z`} icon={RedoIcon} enabled={hasEditor && canRedo} tabStop={tab(1)} onClick={() => editor?.chain().focus().redo().run()} />
      <ToolButton
        label="Find and replace"
        shortcut={`${mod}+F`}
        icon={SearchIcon}
        enabled={hasEditor}
        pressed={findOpen}
        tabStop={tab(2)}
        onClick={() => setFindOpen(!findOpen)}
      />

      <DropdownMenu open={fontMenuOpen && hasEditor} onOpenChange={(open) => setFontMenuOpen(open && hasEditor)}>
        <Hint label="Font size">
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" />}
            data-tool
            tabIndex={tab(3) ? 0 : -1}
            aria-label="Font size"
            aria-disabled={!hasEditor}
            className={toolClass}
          >
            <TypeIcon className="size-5" />
          </DropdownMenuTrigger>
        </Hint>
        <DropdownMenuContent align="center" className="w-28">
          {FONT_SIZES.map((size) => (
            <DropdownMenuItem key={size} onClick={() => setFontSize(size)} aria-current={size === fontSize ? "true" : undefined}>
              <span className="flex-1">{size} pt</span>
              <CheckIcon className={cn("size-4", size !== fontSize && "invisible")} aria-hidden />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolButton
        label="Thesaurus"
        shortcut={`${mod}+Shift+T`}
        icon={BookAIcon}
        enabled={hasEditor}
        tabStop={tab(4)}
        onClick={() => setThesaurusOpen(true)}
      />
      {/* Read aloud has its own spec; it stays a placeholder here. */}
      <Hint label="Read aloud (coming soon)">
        <Button variant="ghost" size="icon" data-tool tabIndex={tab(5) ? 0 : -1} aria-label="Read aloud" aria-disabled className={toolClass}>
          <HeadphonesIcon className="size-5" />
        </Button>
      </Hint>
    </div>
  );
}
