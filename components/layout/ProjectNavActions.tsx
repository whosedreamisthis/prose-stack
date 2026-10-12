"use client";

import { BookOpenIcon, MenuIcon, SettingsIcon, SpellCheckIcon, type LucideIcon } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { Hint } from "@/components/layout/Hint";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toFormatting } from "@/lib/formatting";
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
}

/** Project-only navbar actions; renders nothing outside /projects/[projectId]. Collapses into a menu on small screens. */
export function ProjectNavActions({ projects, theme = null }: ProjectNavActionsProps) {
  const { projectId } = useParams<{ projectId?: string }>();
  const router = useRouter();
  const openSettings = useSettingsStore((s) => s.openSettings);
  if (!projectId) return null;

  const project = projects?.find((p) => p.id === projectId);

  // Spell check stays disabled until it ships; each feature wires its own button. Exports live in the outline's row menus.
  const actions: Action[] = [
    { label: "Spell check", icon: SpellCheckIcon },
    { label: "Book view", icon: BookOpenIcon, onSelect: () => router.push(`/projects/${projectId}/manuscript/book`) },
    {
      label: "Settings",
      icon: SettingsIcon,
      onSelect: project
        ? () =>
            openSettings(project.id, {
              title: project.title,
              subtitle: project.subtitle ?? "",
              author: project.author,
              ...toFormatting(project),
              theme,
            })
        : undefined,
    },
  ];

  return (
    <>
      <div className="hidden items-center gap-1 md:flex">
        {actions.map(({ label, icon: Icon, onSelect }) => (
          <Hint key={label} label={onSelect ? label : `${label} (coming soon)`} disabled={!onSelect}>
            <Button
              variant="ghost"
              size="default"
              disabled={!onSelect}
              aria-label={label}
              onClick={onSelect}
              className="disabled:opacity-70"
            >
              <Icon className="size-5" />
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
            {actions.map(({ label, icon: Icon, onSelect }) => (
              <DropdownMenuItem key={label} disabled={!onSelect} onClick={onSelect}>
                <Icon /> {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SettingsDialog />
    </>
  );
}
