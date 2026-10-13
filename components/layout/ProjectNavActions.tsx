"use client";

import { BookOpenIcon, MenuIcon, SettingsIcon, SpellCheckIcon, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Hint } from "@/components/layout/Hint";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toFormatting } from "@/lib/formatting";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import type { ThemeChoice } from "@/lib/theme-config";
import type { ProjectSummary } from "@/types/projects";

interface ProjectNavActionsProps {
  /** The user's projects and saved theme. Until they load (or off a project page) the settings button stays disabled. */
  projects?: ProjectSummary[];
  theme?: ThemeChoice | null;
}

interface Action {
  label: string;
  icon: LucideIcon;
  /** Without a handler the action is not built yet and stays disabled. */
  onSelect?: () => void;
  /** Set for toggles: whether the feature is on right now. */
  pressed?: boolean;
  /** Set for links: the page this action opens is the one being viewed (shown highlighted, no on/off wording). */
  current?: boolean;
}

/** Project-only navbar actions; renders nothing outside /projects/[projectId]. Collapses into a menu on small screens. */
export function ProjectNavActions({ projects, theme = null }: ProjectNavActionsProps) {
  const { projectId } = useParams<{ projectId?: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const openSettings = useSettingsStore((s) => s.openSettings);
  const spellcheck = useEditorStore((s) => s.spellcheck);
  const toggleSpellcheck = useEditorStore((s) => s.toggleSpellcheck);

  // The saved spell check choice loads after mount so the first render matches the server.
  useEffect(() => {
    void useEditorStore.persist.rehydrate();
  }, []);

  const project = projects?.find((p) => p.id === projectId);
  const settingsRequested = useSettingsStore((s) => s.openRequested);
  const clearOpenRequest = useSettingsStore((s) => s.clearOpenRequest);

  // The sidebar's "Choose a story structure" prompt asks for the settings; this holds the values to open them with.
  useEffect(() => {
    if (!settingsRequested) return;
    clearOpenRequest(); // cleared even without a project, so the request cannot open the modal later
    if (!project) return;
    openSettings(project.id, {
      title: project.title,
      subtitle: project.subtitle ?? "",
      author: project.author,
      coverColor: project.coverColor,
      storyTemplateId: project.storyTemplateId,
      ...toFormatting(project),
      theme,
    });
  }, [settingsRequested, project, theme, openSettings, clearOpenRequest]);

  if (!projectId) return null;

  // Exports live in the outline's row menus.
  const actions: Action[] = [
    { label: "Spell check", icon: SpellCheckIcon, onSelect: toggleSpellcheck, pressed: spellcheck },
    { label: "Book view", icon: BookOpenIcon, onSelect: () => router.push(`/projects/${projectId}/manuscript/book`),
      current: pathname.endsWith("/manuscript/book"),
    },
    {
      label: "Settings",
      icon: SettingsIcon,
      onSelect: project
        ? () =>
            openSettings(project.id, {
              title: project.title,
              subtitle: project.subtitle ?? "",
              author: project.author,
              coverColor: project.coverColor,
              storyTemplateId: project.storyTemplateId,
              ...toFormatting(project),
              theme,
            })
        : undefined,
    },
  ];

  return (
    <>
      <div className="hidden items-center gap-1 md:flex">
        {actions.map(({ label, icon: Icon, onSelect, pressed, current }) => (
          <Hint
            key={label}
            label={onSelect ? (pressed === undefined ? label : `${label} ${pressed ? "on" : "off"}`) : `${label} (coming soon)`}
            disabled={!onSelect}
          >
            <Button
              variant="ghost"
              size="default"
              disabled={!onSelect}
              aria-label={label}
              aria-pressed={pressed}
              aria-current={current ? "page" : undefined}
              onClick={onSelect}
              className={`disabled:opacity-70 ${pressed === true || current ? "bg-primary! text-primary-foreground! hover:bg-primary/90!" : ""} ${pressed === false ? "text-foreground/70! dark:text-zinc-200!" : ""}`}
            >
              <Icon
                strokeWidth={pressed === undefined ? 2 : 2.5}
                className={`size-5 ${pressed === true || current ? "text-primary-foreground" : pressed === false ? "text-foreground/80 dark:text-zinc-200" : ""}`}
              />
              <span className="hidden lg:inline">{label}</span>
            </Button>
          </Hint>
        ))}
      </div>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Project actions" />}>
            <MenuIcon className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {actions.map(({ label, icon: Icon, onSelect, pressed, current }) => (
              <DropdownMenuItem key={label} disabled={!onSelect} onClick={onSelect}>
                <Icon className={pressed === false ? "opacity-50" : current ? "text-primary" : ""} /> {pressed === undefined ? label : `${label} ${pressed ? "on" : "off"}`}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SettingsDialog />
    </>
  );
}
