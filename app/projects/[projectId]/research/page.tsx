import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { ResearchEmpty } from "@/components/research/ResearchEmpty";
import { ResearchItemView } from "@/components/research/ResearchItemView";
import { ResearchSkeleton } from "@/components/research/ResearchSkeleton";
import { getCurrentUser } from "@/lib/auth";
import { toFormatting } from "@/lib/formatting";
import { getProject } from "@/lib/projects";
import { getResearch, getResearchItem, getResearchLinkOptions } from "@/lib/research";

type PageParams = PageProps<"/projects/[projectId]/research">;

async function ResearchLoader({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const requested = Array.isArray(query.item) ? query.item[0] : query.item;
  // Everything in one round trip: the item is fetched alongside the rest, and a stale id just shows the empty state.
  const [project, library, item, linkOptions] = await Promise.all([
    getProject(user.id, projectId),
    getResearch(user.id, projectId),
    requested ? getResearchItem(user.id, projectId, requested) : null,
    getResearchLinkOptions(user.id, projectId),
  ]);
  if (!project) notFound();

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      {item ? (
        <ResearchItemView key={item.id} projectId={projectId} item={item} formatting={toFormatting(project)} linkOptions={linkOptions} />
      ) : (
        <ResearchEmpty projectId={projectId} hasResearch={library.folders.length + library.items.length > 0} />
      )}
    </>
  );
}

export default function ResearchPage(props: PageParams) {
  return (
    <PendingSwitch kind="item" fallback={<ResearchSkeleton />}>
      <Suspense fallback={<ResearchSkeleton />}>
        <ResearchLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
