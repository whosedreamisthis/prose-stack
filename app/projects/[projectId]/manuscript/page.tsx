import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
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
      <h1 className="text-2xl font-semibold">{project.title}</h1>
      {project.subtitle && <p className="text-muted-foreground">{project.subtitle}</p>}
      <p className="text-sm text-muted-foreground">The manuscript editor arrives with the Manuscript feature.</p>
    </>
  );
}

export default function ManuscriptPage(props: PageProps<"/projects/[projectId]/manuscript">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
        <ManuscriptPlaceholder params={props.params} />
      </Suspense>
    </main>
  );
}
