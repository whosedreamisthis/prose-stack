import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CharacterList } from "@/components/characters/CharacterList";
import { SidebarSection } from "@/components/layout/SidebarSection";
import { ManuscriptTree } from "@/components/manuscript/ManuscriptTree";
import { getCurrentUser } from "@/lib/auth";
import { listCharacters } from "@/lib/characters";
import { getManuscript } from "@/lib/manuscript";
import { getProject } from "@/lib/projects";

interface ProjectSidebarProps {
  params: Promise<{ projectId: string }>;
}

async function SidebarLoader({ params }: ProjectSidebarProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [project, nodes, characters] = await Promise.all([
    getProject(user.id, projectId),
    getManuscript(user.id, projectId),
    listCharacters(user.id, projectId),
  ]);
  if (!project) return null;

  return (
    <div className="flex flex-col gap-3">
      <ManuscriptTree projectId={projectId} nodes={nodes} />
      <SidebarSection slug="characters" label="Characters">
        <CharacterList projectId={projectId} characters={characters} />
      </SidebarSection>
    </div>
  );
}

/**
 * The left sidebar of every project page: one collapsible section per area (Places, Research and Trash join as their
 * features ship). It carries its own Suspense boundary: Next.js validates navigations into a slot without the one in
 * the shared project layout, so the data access must be covered here.
 */
export function ProjectSidebar(props: ProjectSidebarProps) {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />}>
      <SidebarLoader {...props} />
    </Suspense>
  );
}
