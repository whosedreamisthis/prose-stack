import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { EditorColumn } from "@/components/layout/EditorColumn";
import { EditorStats } from "@/components/manuscript/EditorStats";
import { SceneEditor } from "@/components/manuscript/SceneEditor";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript, getScene, getWordStats } from "@/lib/manuscript";
import { resolveActiveScene } from "@/lib/manuscript-tree";
import { getProject } from "@/lib/projects";

type PageParams = PageProps<"/projects/[projectId]/manuscript">;

async function SceneLoader({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [project, nodes, stats] = await Promise.all([
    getProject(user.id, projectId),
    getManuscript(user.id, projectId),
    getWordStats(projectId),
  ]);
  if (!project) notFound();

  const requested = Array.isArray(query.scene) ? query.scene[0] : query.scene;
  const active = resolveActiveScene(nodes, requested);
  const scene = active ? await getScene(user.id, projectId, active.id) : null;

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <EditorColumn stats={<EditorStats stats={stats} savedSceneWords={scene?.wordCount ?? 0} />}>
        {scene ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <h1 className="font-serif text-2xl font-semibold">{scene.title}</h1>
            <SceneEditor
              key={scene.id}
              projectId={projectId}
              scene={{ id: scene.id, title: scene.title, content: scene.content, updatedAt: scene.updatedAt.getTime() }}
            />
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-2 pt-16 text-center">
            <h1 className="text-xl font-semibold">No scenes yet</h1>
            <p className="text-sm text-muted-foreground">
              Add a chapter from the outline&apos;s book menu, then use the chapter&apos;s menu to add a scene. Your writing lives in scenes.
            </p>
          </div>
        )}
      </EditorColumn>
    </>
  );
}

function EditorSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4" aria-hidden>
      <div className="h-8 w-1/2 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      {[100, 95, 100, 80, 90].map((w, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-muted motion-reduce:animate-none" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

export default function ManuscriptPage(props: PageParams) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <SceneLoader params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
