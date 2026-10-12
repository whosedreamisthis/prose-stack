import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { ArchiveList } from "@/components/trash/ArchiveList";
import { HiddenItemView } from "@/components/trash/HiddenItemView";
import { ListSkeleton } from "@/components/trash/ListSkeleton";
import { getCurrentUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { getHiddenView, listArchive } from "@/lib/trash";
import { parseItemParam } from "@/lib/trash-config";

type PageParams = PageProps<"/projects/[projectId]/archive">;

async function ArchiveLoader({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // `?item=<kind>:<id>` opens that item itself; without it, or when it is gone, the list.
  const item = parseItemParam(query.item);
  const [project, items, view] = await Promise.all([
    getProject(user.id, projectId),
    listArchive(user.id, projectId),
    item ? getHiddenView(user.id, projectId, "archive", item.kind, item.id) : null,
  ]);
  if (!project) notFound();

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      {view ? <HiddenItemView projectId={projectId} from="archive" view={view} /> : <ArchiveList projectId={projectId} items={items} />}
    </>
  );
}

export default function ArchivePage(props: PageParams) {
  return (
    <PendingSwitch kind="item" fallback={<ListSkeleton />}>
      <Suspense fallback={<ListSkeleton />}>
        <ArchiveLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
