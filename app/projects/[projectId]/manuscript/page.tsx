import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { EditorColumn } from "@/components/layout/EditorColumn";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { EditorSkeleton } from "@/components/manuscript/EditorSkeleton";
import { EditorStats } from "@/components/manuscript/EditorStats";
import { SceneEditor } from "@/components/manuscript/SceneEditor";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { toFormatting } from "@/lib/formatting";
import { getManuscript, getScene, getWordStats } from "@/lib/manuscript";
import { resolveActiveScene } from "@/lib/manuscript-tree";
import { getProject } from "@/lib/projects";

type PageParams = PageProps<"/projects/[projectId]/manuscript">;

/**
 * The scene text itself. It streams in on its own, after the page around it: the outline already knows the scene's title and
 * word count, so the heading and footer do not wait for the scene's content (one database round trip fewer before the first paint).
 */
async function SceneBody({ userId, projectId, sceneId, project }: { userId: string; projectId: string; sceneId: string; project: NonNullable<Awaited<ReturnType<typeof getProject>>> }) {
  const scene = await getScene(userId, projectId, sceneId);
  if (!scene) return <p className="text-sm text-muted-foreground">This scene could not be found.</p>;
  return (
    <SceneEditor
      key={scene.id}
      projectId={projectId}
      formatting={toFormatting(project)}
      scene={{ id: scene.id, title: scene.title, content: scene.content, updatedAt: scene.updatedAt.getTime() }}
    />
  );
}

async function SceneLoader({ params, searchParams }: { params: PageParams["params"]; searchParams: PageParams["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const requested = Array.isArray(query.scene) ? query.scene[0] : query.scene;
  const [project, nodes, stats] = await Promise.all([getProject(user.id, projectId), getManuscript(user.id, projectId), getWordStats(projectId)]);
  if (!project) notFound();

  const active = resolveActiveScene(nodes, requested);

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <EditorColumn stats={<EditorStats stats={stats} savedSceneWords={active?.wordCount ?? 0} />}>
        {active ? (
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
            <h1 className="font-serif text-2xl font-semibold">{active.title}</h1>
            <Suspense fallback={<EditorSkeleton bodyOnly />}>
              <SceneBody userId={user.id} projectId={projectId} sceneId={active.id} project={project} />
            </Suspense>
          </div>
        ) : (
          <div className="mx-auto flex max-w-md flex-col gap-2 pt-16 text-center">
            <h1 className="text-xl font-semibold">No scenes yet</h1>
            <p className="text-sm text-muted-foreground">
              Add a chapter from the outline&apos;s book menu, then use the chapter&apos;s menu to add a scene. Your writing lives in
              scenes.
            </p>
          </div>
        )}
      </EditorColumn>
    </>
  );
}

export default function ManuscriptPage(props: PageParams) {
  return (
    <PendingSwitch kind="scene" fallback={<EditorSkeleton />}>
      <Suspense fallback={<EditorSkeleton />}>
        <SceneLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
