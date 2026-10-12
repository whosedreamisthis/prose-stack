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
import type { SceneDetail } from "@/types/manuscript";

interface NodeBookViewProps {
  params: Promise<{ projectId: string; nodeId?: string }>;
  /** What the page opens: the whole manuscript, or one part or chapter of it. */
  type: "BOOK" | "PART" | "CHAPTER";
}

type Block = { kind: "heading"; id: string; title: string; level: number } | { kind: "scene"; scene: SceneDetail; level: number };

const EMPTY_HINT = {
  BOOK: "No scenes yet. Add a chapter from the Manuscript menu, then a scene from the chapter's menu.",
  PART: "No scenes yet. Use the part's and chapters' menus to add some.",
  CHAPTER: "No scenes yet. Use the chapter's menu to add one.",
};

/**
 * The manuscript, a part or a chapter as editable text: its title, then each chapter's title and each scene's text as
 * an editor, one after the other. Headings go one level down per level of the outline.
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
  const root = type === "BOOK" ? null : nodes.find((n) => n.id === nodeId && n.type === type);
  if (type !== "BOOK" && !root) notFound();

  // Reading order, with each scene fetched alongside the rest.
  const pending: ({ kind: "heading"; id: string; title: string; level: number } | { kind: "scene"; id: string; level: number })[] = [];
  const walk = (parentId: string | null, level: number) => {
    for (const node of childrenOf(nodes, parentId)) {
      if (node.type === "SCENE") pending.push({ kind: "scene", id: node.id, level });
      else {
        pending.push({ kind: "heading", id: node.id, title: node.title, level });
        walk(node.id, level + 1);
      }
    }
  };
  walk(root?.id ?? null, 2);
  const blocks: Block[] = (
    await Promise.all(
      pending.map(async (b): Promise<Block | null> => {
        if (b.kind === "heading") return b;
        const scene = await getScene(user.id, projectId, b.id);
        return scene && { kind: "scene", scene, level: b.level };
      }),
    )
  ).filter((b) => b !== null);
  const empty = !blocks.some((b) => b.kind === "scene");
  const formatting = toFormatting(project);
  const Heading = (level: number) => `h${Math.min(level, 6)}` as "h2";

  return (
    <>
      <ActiveProjectSync projectId={project.id} />
      <EditorColumn stats={<EditorStats stats={stats} savedSceneWords={0} />}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
          <h1 className="text-center font-serif text-3xl font-semibold">{root?.title ?? project.title}</h1>
          {empty && <p className="text-center text-sm text-muted-foreground">{EMPTY_HINT[type]}</p>}
          {blocks.map((block, i) => {
            if (block.kind === "heading") {
              const H = Heading(block.level);
              return (
                <H key={block.id} className={block.level <= 2 ? "font-serif text-2xl font-semibold" : "font-serif text-xl font-semibold"}>
                  {block.title}
                </H>
              );
            }
            const { scene } = block;
            const H = Heading(block.level);
            return (
              <section key={scene.id} className="flex flex-col gap-2">
                <H className="font-serif text-xl font-semibold">{scene.title}</H>
                <LazySceneEditor
                  // Only the first scene on the page mounts straight away; the rest wait until they are near the viewport.
                  eager={blocks.findIndex((b) => b.kind === "scene") === i}
                  wordCount={scene.wordCount}
                  projectId={projectId}
                  formatting={formatting}
                  scene={{ id: scene.id, title: scene.title, content: scene.content, updatedAt: scene.updatedAt.getTime() }}
                />
              </section>
            );
          })}
        </div>
      </EditorColumn>
    </>
  );
}
