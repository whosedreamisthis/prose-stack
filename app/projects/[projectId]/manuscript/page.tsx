import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { EditorColumn } from "@/components/layout/EditorColumn";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";

async function ManuscriptPlaceholder({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const project = await getProject(user.id, projectId);
  if (!project) notFound();

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <EditorColumn
        breadcrumbs={[{ label: project.title, href: `/projects/${project.id}/manuscript` }, { label: "Manuscript" }]}
      >
        <div className="mx-auto flex max-w-2xl flex-col gap-2 text-center">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          {project.subtitle && <p className="text-muted-foreground">{project.subtitle}</p>}
          <p className="text-sm text-muted-foreground">The manuscript editor arrives with the Manuscript feature.</p>
        </div>
      </EditorColumn>
    </>
  );
}

export default function ManuscriptPage(props: PageProps<"/projects/[projectId]/manuscript">) {
  return (
    <Suspense fallback={<p className="p-6 text-muted-foreground">Loading…</p>}>
      <ManuscriptPlaceholder params={props.params} />
    </Suspense>
  );
}
