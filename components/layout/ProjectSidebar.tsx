import { Suspense } from "react";
import { redirect } from "next/navigation";
import { CharacterList } from "@/components/characters/CharacterList";
import { SidebarSection } from "@/components/layout/SidebarSection";
import { ManuscriptTree } from "@/components/manuscript/ManuscriptTree";
import { AddPlaceButton } from "@/components/places/AddPlaceButton";
import { HiddenItemsList } from "@/components/trash/HiddenItemsList";
import { PlaceList } from "@/components/places/PlaceList";
import { PlotLinesSection } from "@/components/plot/PlotLinesSection";
import { getCurrentUser } from "@/lib/auth";
import { listCharacters } from "@/lib/characters";
import { getManuscript } from "@/lib/manuscript";
import { listLabels } from "@/lib/labels";
import { listPlaces } from "@/lib/places";
import { getPlot } from "@/lib/plot";
import { listArchive, listTrash } from "@/lib/trash";
import { getProject } from "@/lib/projects";

interface ProjectSidebarProps {
  params: Promise<{ projectId: string }>;
}

async function SidebarLoader({ params }: ProjectSidebarProps) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [project, nodes, characters, places, plot, labels, trash, archive] = await Promise.all([
    getProject(user.id, projectId),
    getManuscript(user.id, projectId),
    listCharacters(user.id, projectId),
    listPlaces(user.id, projectId),
    getPlot(user.id, projectId),
    listLabels(user.id, projectId),
    listTrash(user.id, projectId),
    listArchive(user.id, projectId),
  ]);
  if (!project) return null;

  return (
    <div className="flex flex-col gap-3">
      <ManuscriptTree projectId={projectId} projectTitle={project.title} nodes={nodes} labels={labels} />
      <SidebarSection slug="plot" label="Plots">
        <PlotLinesSection projectId={projectId} plot={plot} />
      </SidebarSection>
      <SidebarSection slug="characters" label="Characters">
        <CharacterList projectId={projectId} characters={characters} />
      </SidebarSection>
      <SidebarSection slug="places" label="Places" action={<AddPlaceButton projectId={projectId} />}>
        <PlaceList projectId={projectId} places={places} />
      </SidebarSection>
      <SidebarSection slug="archive" label="Archive">
        <HiddenItemsList projectId={projectId} slug="archive" items={archive} empty="Nothing archived." />
      </SidebarSection>
      <SidebarSection slug="trash" label="Trash">
        <HiddenItemsList projectId={projectId} slug="trash" items={trash} empty="The trash is empty." />
      </SidebarSection>
    </div>
  );
}

/**
 * The left sidebar of every project page: one collapsible section per area (Research joins as its
 * feature ships). It carries its own Suspense boundary: Next.js validates navigations into a slot without the one in
 * the shared project layout, so the data access must be covered here.
 */
export function ProjectSidebar(props: ProjectSidebarProps) {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />}>
      <SidebarLoader {...props} />
    </Suspense>
  );
}
