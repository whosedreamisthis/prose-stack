import { redirect } from "next/navigation";
import { NodeDetailsPanel } from "@/components/manuscript/NodeDetailsPanel";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript } from "@/lib/manuscript";
import { sceneOrder, subtreeIds } from "@/lib/manuscript-tree";
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

  const inside = new Set(subtreeIds(nodes, nodeId));
  const allScenes = sceneOrder(nodes);
  const [notes, groups] = await Promise.all([
    listSceneNotes(user.id, projectId, nodeId),
    Promise.all(
      allScenes
        .filter((s) => inside.has(s.id))
        .map(async (s) => ({ scene: { id: s.id, title: s.title }, notes: await listSceneNotes(user.id, projectId, s.id) })),
    ),
  ]);

  return (
    <NodeDetailsPanel
      key={nodeId}
      projectId={projectId}
      title={type === "CHAPTER" ? "Chapter details" : "Part details"}
      nodeId={nodeId}
      nodeTitle={node.title}
      notes={notes}
      groups={groups}
      plot={plot}
      scenes={allScenes.map((s) => ({ id: s.id, title: s.title }))}
    />
  );
}
