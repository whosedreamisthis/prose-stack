import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ManuscriptTree } from "@/components/manuscript/ManuscriptTree";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript } from "@/lib/manuscript";
import { getProject } from "@/lib/projects";

async function TreeLoader({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [project, nodes] = await Promise.all([getProject(user.id, projectId), getManuscript(user.id, projectId)]);
  if (!project) return null;
  return <ManuscriptTree projectId={projectId} title={project.title} nodes={nodes} />;
}

// The slot carries its own Suspense boundary: Next.js validates navigations into this segment without the one in the
// shared project layout, so the data access must be covered here.
export default function ManuscriptTreeSlot(props: PageProps<"/projects/[projectId]/manuscript">) {
  return (
    <Suspense fallback={<div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />}>
      <TreeLoader params={props.params} />
    </Suspense>
  );
}
