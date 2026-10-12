import { redirect } from "next/navigation";
import { NodeDetailsPanel } from "@/components/manuscript/NodeDetailsPanel";
import { ProjectNotes } from "@/components/manuscript/ProjectNotes";
import { SceneNotes } from "@/components/manuscript/SceneNotesPanel";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript } from "@/lib/manuscript";
import { childrenOf, sceneOrder } from "@/lib/manuscript-tree";
import { getPlot } from "@/lib/plot";
import { getProject } from "@/lib/projects";
import { listProjectNotes } from "@/lib/project-notes";
import { listSceneNotes } from "@/lib/scene-notes";

interface NodeDetailsLoaderProps {
  params: Promise<{ projectId: string; nodeId?: string }>;
  /** What is open: a chapter, a part, or the whole book (no node id). */
  type: "CHAPTER" | "PART" | "BOOK";
}

/** The right sidebar of a chapter or part: its own notes then those of each scene inside it, and the plot points of those scenes. Nothing for a missing node. */
export async function NodeDetailsLoader({ params, type }: NodeDetailsLoaderProps) {
  const { projectId, nodeId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [nodes, plot, project] = await Promise.all([
    getManuscript(user.id, projectId),
    getPlot(user.id, projectId),
    type === "BOOK" ? getProject(user.id, projectId) : null,
  ]);
  const node = type === "BOOK" ? null : nodes.find((n) => n.id === nodeId && n.type === type);
  if (type === "BOOK" ? !project : !node || !nodeId) return null;

  const allScenes = sceneOrder(nodes);
  // Everything inside, in reading order: a part lists its chapters and their scenes, a chapter its scenes.
  const inside: { id: string; title: string; type: "PART" | "CHAPTER" | "SCENE" }[] = [];
  const walk = (parentId: string | null) => {
    for (const child of childrenOf(nodes, parentId)) {
      inside.push({ id: child.id, title: child.title, type: child.type });
      walk(child.id);
    }
  };
  walk(nodeId ?? null);
  const [ownNotes, items] = await Promise.all([
    type === "BOOK" ? listProjectNotes(user.id, projectId) : listSceneNotes(user.id, projectId, nodeId!),
    Promise.all(inside.map(async (item) => ({ ...item, notes: await listSceneNotes(user.id, projectId, item.id) }))),
  ]);

  return (
    <NodeDetailsPanel
      key={nodeId ?? "book"}
      projectId={projectId}
      title={type === "CHAPTER" ? "Chapter details" : type === "PART" ? "Part details" : "Manuscript details"}
      ownTitle={node?.title ?? project?.title ?? ""}
      ownNotes={
        type === "BOOK" ? (
          <ProjectNotes projectId={projectId} notes={ownNotes} />
        ) : (
          <SceneNotes projectId={projectId} sceneId={nodeId!} notes={ownNotes} />
        )
      }
      items={items}
      plot={plot}
      scenes={allScenes.map((s) => ({ id: s.id, title: s.title }))}
    />
  );
}
