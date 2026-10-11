"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BookOpenIcon, ChevronDownIcon, LayoutGridIcon, PlusIcon } from "lucide-react";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
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
import { applyAccent, getAccentTokens } from "@/lib/accent";
import { MAX_PROJECTS_PER_USER, PROJECT_LIMIT_MESSAGE } from "@/lib/project-config";
import { useProjectStore } from "@/lib/stores/project-store";
import type { ProjectSummary } from "@/types/projects";

export function ProjectSwitcher({ projects }: { projects: ProjectSummary[] }) {
  // The route is the source of truth, and it is correct on the very first render (the store only syncs after mount).
  const { projectId: activeProjectId } = useParams<{ projectId?: string }>();
  const setNewProjectOpen = useProjectStore((s) => s.setNewProjectOpen);
  const active = projects.find((p) => p.id === activeProjectId);
  const atLimit = projects.length >= MAX_PROJECTS_PER_USER;
  const activeColor = active?.coverColor;

  // Keeps <html> in step with the route: set inside a project, cleared everywhere else. The server also streams the
  // same tokens as a <style> for hard loads; this covers in-app navigation without waiting for the server.
  useEffect(() => {
    applyAccent(activeColor ? getAccentTokens(activeColor) : null);
  }, [activeColor]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" size="sm" className="min-w-0" />}>
          <BookOpenIcon className="shrink-0" />
          <span className="min-w-0 max-w-24 truncate sm:max-w-40">{active?.title ?? "Projects"}</span>
          <ChevronDownIcon className="shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Your projects</DropdownMenuLabel>
            {projects.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No projects yet</p>}
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                render={<Link href={`/projects/${project.id}/manuscript`} />}
                onClick={() => applyAccent(getAccentTokens(project.coverColor))}
                className={project.id === activeProjectId ? "font-medium" : undefined}
              >
                <span className="truncate">{project.title}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={atLimit} onClick={() => setNewProjectOpen(true)}>
            <PlusIcon /> New project
          </DropdownMenuItem>
          {atLimit && <p className="px-2 py-1 text-xs text-muted-foreground">{PROJECT_LIMIT_MESSAGE}</p>}
          <DropdownMenuItem render={<Link href="/projects" />}>
            <LayoutGridIcon /> All projects
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NewProjectDialog />
    </>
  );
}
