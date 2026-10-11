import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { EditorColumn } from "@/components/layout/EditorColumn";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";

async function BookPlaceholder({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const project = await getProject(user.id, projectId);
  if (!project) notFound();

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <EditorColumn stats="">
        <div className="mx-auto flex max-w-md flex-col gap-2 pt-16 text-center">
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <p className="text-sm text-muted-foreground">The book view is coming soon.</p>
        </div>
      </EditorColumn>
    </>
  );
}

export default function BookPage(props: PageProps<"/projects/[projectId]/manuscript/book">) {
  return (
    <Suspense fallback={null}>
      <BookPlaceholder params={props.params} />
    </Suspense>
  );
}
