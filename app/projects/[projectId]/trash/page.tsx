import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { TrashList } from "@/components/trash/TrashList";
import { HiddenItemView } from "@/components/trash/HiddenItemView";
import { ListSkeleton } from "@/components/trash/ListSkeleton";
import { getCurrentUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { getHiddenView, listTrash } from "@/lib/trash";
import { parseItemParam } from "@/lib/trash-config";

type PageParams = PageProps<"/projects/[projectId]/trash">;

async function TrashLoader({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  // `?item=<kind>:<id>` opens that item itself; without it, or when it is gone, the list.
  const item = parseItemParam(query.item);
  const [project, items, view] = await Promise.all([
    getProject(user.id, projectId),
    listTrash(user.id, projectId),
    item ? getHiddenView(user.id, projectId, "trash", item.kind, item.id) : null,
  ]);
  if (!project) notFound();

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      {view ? <HiddenItemView projectId={projectId} from="trash" view={view} /> : <TrashList projectId={projectId} items={items} />}
    </>
  );
}

export default function TrashPage(props: PageParams) {
  return (
    <PendingSwitch kind="item" fallback={<ListSkeleton />}>
      <Suspense fallback={<ListSkeleton />}>
        <TrashLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
