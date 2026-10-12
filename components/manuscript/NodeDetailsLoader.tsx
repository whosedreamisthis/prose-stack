import { redirect } from "next/navigation";
import { NodeDetailsPanel } from "@/components/manuscript/NodeDetailsPanel";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript } from "@/lib/manuscript";
import { childrenOf, sceneOrder } from "@/lib/manuscript-tree";
import { getPlot } from "@/lib/plot";
import { listSceneNotes } from "@/lib/scene-notes";

interface NodeDetailsLoaderProps {
  params: Promise<{ projectId: string; nodeId: string }>;
  type: "CHAPTER" | "PART";
}

/** The right sidebar of a chapter or part: its own notes then those of each scene inside it, and the plot points of those scenes. Nothing for a missing node. */
export async function NodeDetailsLoader({ params, type }: NodeDetailsLoaderProps) {
  const { projectId, nodeId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const [nodes, plot] = await Promise.all([getManuscript(user.id, projectId), getPlot(user.id, projectId)]);
  const node = nodes.find((n) => n.id === nodeId && n.type === type);
  if (!node) return null;

  const allScenes = sceneOrder(nodes);
  // Everything inside, in reading order: a part lists its chapters and their scenes, a chapter its scenes.
  const inside: { id: string; title: string; type: "CHAPTER" | "SCENE" }[] = [];
  const walk = (parentId: string) => {
    for (const child of childrenOf(nodes, parentId)) {
      if (child.type === "PART") continue;
      inside.push({ id: child.id, title: child.title, type: child.type });
      walk(child.id);
    }
  };
  walk(nodeId);
  const [notes, items] = await Promise.all([
    listSceneNotes(user.id, projectId, nodeId),
    Promise.all(inside.map(async (item) => ({ ...item, notes: await listSceneNotes(user.id, projectId, item.id) }))),
  ]);

  return (
    <NodeDetailsPanel
      key={nodeId}
      projectId={projectId}
      title={type === "CHAPTER" ? "Chapter details" : "Part details"}
      nodeId={nodeId}
      nodeTitle={node.title}
      notes={notes}
      items={items}
      plot={plot}
      scenes={allScenes.map((s) => ({ id: s.id, title: s.title }))}
    />
  );
}
