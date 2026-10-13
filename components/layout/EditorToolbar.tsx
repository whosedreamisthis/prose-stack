"use client";

import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { updateProjectSettings } from "@/actions/settings";
import { useEditorState } from "@tiptap/react";
import { BoldIcon, BookAIcon, CheckIcon, ClipboardCheckIcon, HeadphonesIcon, ItalicIcon, PauseIcon, PlayIcon, RedoIcon, SearchIcon, SquareIcon, TypeIcon, UndoIcon, type LucideIcon } from "lucide-react";
import { Hint } from "@/components/layout/Hint";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useModKey } from "@/hooks/useModKey";
import { useReadAloud } from "@/hooks/useReadAloud";
import { startProofread } from "@/lib/proofread/session";
import { useProofreadStore } from "@/lib/stores/proofread-store";
import { TOOLBAR_FONT_SIZES, DEFAULT_FORMATTING } from "@/lib/project-config";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useFormattingStore } from "@/lib/stores/formatting-store";
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
  const projectId = useFormattingStore((s) => s.projectId);
  const fontSize = useFormattingStore((s) => s.preview?.fontSize ?? s.saved?.fontSize ?? DEFAULT_FORMATTING.fontSize);
  const setPreview = useFormattingStore((s) => s.setPreview);
  const speech = useReadAloud();
  const proofreadRunning = useProofreadStore((s) => s.status === "running");
  const [stop, setStop] = useState(0);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  const { canUndo, canRedo, bold, italic } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      canUndo: !!editor?.can().undo(),
      canRedo: !!editor?.can().redo(),
      bold: !!editor?.isActive("bold"),
      italic: !!editor?.isActive("italic"),
    }),
  }) ?? { canUndo: false, canRedo: false, bold: false, italic: false };
  const hasEditor = !!editor;

  // The size is a project setting (the same one as in Settings), so a pick is saved at once. It shows straight away and
  // the saved value takes over when the action returns.
  async function chooseFontSize(size: number) {
    if (!projectId || size === fontSize) return;
    setPreview({ ...useFormattingStore.getState().preview, fontSize: size });
    const result = await updateProjectSettings(projectId, { fontSize: size });
    const { preview } = useFormattingStore.getState();
    if (preview) {
      const rest = { ...preview };
      delete rest.fontSize;
      setPreview(Object.keys(rest).length > 0 ? rest : null);
    }
    if (!result.success) toast.error(result.error);
  }

  // A size set in Settings that is not one of the usual sizes (such as 15) still shows, as the current value.
  const fontSizes = [...new Set([...TOOLBAR_FONT_SIZES, fontSize])].sort((a, b) => a - b);

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
      <ToolButton label="Bold" shortcut={`${mod}+B`} icon={BoldIcon} enabled={hasEditor} pressed={bold} tabStop={tab(2)} onClick={() => editor?.chain().focus().toggleBold().run()} />
      <ToolButton label="Italic" shortcut={`${mod}+I`} icon={ItalicIcon} enabled={hasEditor} pressed={italic} tabStop={tab(3)} onClick={() => editor?.chain().focus().toggleItalic().run()} />
      <ToolButton
        label="Find and replace"
        shortcut={`${mod}+F`}
        icon={SearchIcon}
        enabled={hasEditor}
        pressed={findOpen}
        tabStop={tab(4)}
        onClick={() => setFindOpen(!findOpen)}
      />

      <DropdownMenu open={fontMenuOpen && hasEditor} onOpenChange={(open) => setFontMenuOpen(open && hasEditor)}>
        <Hint label="Font size">
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" />}
            data-tool
            tabIndex={tab(5) ? 0 : -1}
            aria-label="Font size"
            aria-disabled={!hasEditor}
            className={toolClass}
          >
            <TypeIcon className="size-5" />
          </DropdownMenuTrigger>
        </Hint>
        <DropdownMenuContent align="center" className="w-28">
          {fontSizes.map((size) => (
            <DropdownMenuItem key={size} onClick={() => void chooseFontSize(size)} aria-current={size === fontSize ? "true" : undefined}>
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
        tabStop={tab(6)}
        onClick={() => setThesaurusOpen(true)}
      />
      <ToolButton
        label="Proofread"
        shortcut={`${mod}+Alt+P`}
        icon={ClipboardCheckIcon}
        enabled={!proofreadRunning}
        pressed={proofreadRunning}
        tabStop={tab(7)}
        onClick={() => {
          // On a chapter, part or book page the check applies to one scene: the one the writer last clicked in.
          if (!editor || !projectId) toast.message("Click in the scene you want to proofread, then try again.");
          else void startProofread(editor, projectId);
        }}
      />
      <ToolButton
        label={!speech.supported ? "Read aloud (not supported in this browser)" : speech.state === "speaking" ? "Pause reading" : speech.state === "paused" ? "Resume reading" : "Read aloud"}
        icon={speech.state === "speaking" ? PauseIcon : speech.state === "paused" ? PlayIcon : HeadphonesIcon}
        enabled={hasEditor && speech.supported}
        pressed={speech.state !== "idle"}
        tabStop={tab(8)}
        onClick={speech.state === "speaking" ? speech.pause : speech.state === "paused" ? speech.resume : speech.start}
      />
      {speech.state !== "idle" && <ToolButton label="Stop reading" icon={SquareIcon} enabled tabStop={tab(9)} onClick={speech.stop} />}
    </div>
  );
}
