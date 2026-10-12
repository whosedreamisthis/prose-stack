import { notFound, redirect } from "next/navigation";
import { EditorColumn } from "@/components/layout/EditorColumn";
import { EditorStats } from "@/components/manuscript/EditorStats";
import { LazySceneEditor } from "@/components/manuscript/LazySceneEditor";
import { ActiveProjectSync } from "@/components/projects/ActiveProjectSync";
import { getCurrentUser } from "@/lib/auth";
import { toFormatting } from "@/lib/formatting";
import { getManuscript, getScene, getWordStats } from "@/lib/manuscript";
import { childrenOf } from "@/lib/manuscript-tree";
import { getProject } from "@/lib/projects";

interface NodeBookViewProps {
  params: Promise<{ projectId: string; nodeId: string }>;
  type: "PART" | "CHAPTER";
}

/**
 * A part or chapter in book form: its title, then each scene's text as an editor, one after the other. A part shows its
 * chapters' titles between their scenes.
 */
export async function NodeBookView({ params, type }: NodeBookViewProps) {
  const { projectId, nodeId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [project, nodes, stats] = await Promise.all([
    getProject(user.id, projectId),
    getManuscript(user.id, projectId),
    getWordStats(projectId),
  ]);
  if (!project) notFound();
  const root = nodes.find((n) => n.id === nodeId && n.type === type);
  if (!root) notFound();

  const chapters = type === "PART" ? childrenOf(nodes, root.id).filter((n) => n.type === "CHAPTER") : [root];
  const groups = await Promise.all(
    chapters.map(async (chapter) => ({
      chapter,
      scenes: (
        await Promise.all(
          childrenOf(nodes, chapter.id)
            .filter((n) => n.type === "SCENE")
            .map((n) => getScene(user.id, projectId, n.id)),
        )
      ).filter((s) => s !== null),
    })),
  );
  const empty = groups.every((g) => g.scenes.length === 0);
  const formatting = toFormatting(project);

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <EditorColumn stats={<EditorStats stats={stats} savedSceneWords={0} />}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <h1 className="text-center font-serif text-3xl font-semibold">{root.title}</h1>
          {empty && (
            <p className="text-center text-sm text-muted-foreground">
              {type === "PART" ? "No scenes yet. Use the part's and chapters' menus to add some." : "No scenes yet. Use the chapter's menu to add one."}
            </p>
          )}
          {groups.map(({ chapter, scenes }) => (
            <div key={chapter.id} className="flex flex-col gap-6">
              {type === "PART" && <h2 className="font-serif text-2xl font-semibold">{chapter.title}</h2>}
              {scenes.map((scene, i) => (
                <section key={scene.id} className="flex flex-col gap-2">
                  {type === "PART" ? (
                    <h3 className="font-serif text-xl font-semibold">{scene.title}</h3>
                  ) : (
                    <h2 className="font-serif text-xl font-semibold">{scene.title}</h2>
                  )}
                  <LazySceneEditor
                    // Only the first scene on the page mounts straight away; the rest wait until they are near the viewport.
                    eager={i === 0 && chapter === groups[0].chapter}
                    wordCount={scene.wordCount}
                    projectId={projectId}
                    formatting={formatting}
                    scene={{ id: scene.id, title: scene.title, content: scene.content, updatedAt: scene.updatedAt.getTime() }}
                  />
                </section>
              ))}
            </div>
          ))}
        </div>
      </EditorColumn>
    </>
  );
}
