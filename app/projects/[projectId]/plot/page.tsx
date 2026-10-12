import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PlotGrid } from "@/components/plot/PlotGrid";
import { PlotSkeleton } from "@/components/plot/PlotSkeleton";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript } from "@/lib/manuscript";
import { sceneOrder } from "@/lib/manuscript-tree";
import { listLabels } from "@/lib/labels";
import { getPlot } from "@/lib/plot";
import { getProject } from "@/lib/projects";

type PageParams = PageProps<"/projects/[projectId]/plot">;

// The focused plot line (`?line=`) is read in the grid from the URL, not here, so every line shares one cached page.
async function PlotLoader({ params }: { params: PageParams["params"] }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [project, nodes, plot, labels] = await Promise.all([
    getProject(user.id, projectId),
    getManuscript(user.id, projectId),
    getPlot(user.id, projectId),
    listLabels(user.id, projectId),
  ]);
  if (!project) notFound();

  const scenes = sceneOrder(nodes).map((n) => ({ id: n.id, title: n.title }));
  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <PlotGrid projectId={projectId} plot={plot} labels={labels} scenes={scenes} />
    </>
  );
}

export default function PlotPage(props: PageParams) {
  return (
    <Suspense fallback={<PlotSkeleton />}>
      <PlotLoader params={props.params} />
    </Suspense>
  );
}
