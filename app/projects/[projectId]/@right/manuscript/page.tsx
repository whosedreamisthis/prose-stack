import { Suspense } from "react";
import { redirect } from "next/navigation";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { PendingSwitch } from "@/components/layout/PendingSwitch";
import { RightPanel } from "@/components/layout/RightPanel";
import { SceneNotesPanel } from "@/components/manuscript/SceneNotesPanel";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript } from "@/lib/manuscript";
import { resolveActiveScene, sceneOrder } from "@/lib/manuscript-tree";
import { getPlot } from "@/lib/plot";
import { listSceneNotes } from "@/lib/scene-notes";

type SlotProps = PageProps<"/projects/[projectId]/manuscript">;

async function NotesLoader({ params, searchParams }: { params: SlotProps["params"]; searchParams: SlotProps["searchParams"] }) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const requested = Array.isArray(query.scene) ? query.scene[0] : query.scene;
  // Notes are fetched alongside the outline (one round trip). They are scoped to the user's own, live scenes, so a stale
  // id just returns nothing and the outline's pick is fetched instead.
  const [nodes, requestedNotes, plot] = await Promise.all([
    getManuscript(user.id, projectId),
    requested ? listSceneNotes(user.id, projectId, requested) : null,
    getPlot(user.id, projectId),
  ]);
  const active = resolveActiveScene(nodes, requested);
  if (!active) {
    return (
      <RightPanel title="Scene details">
        <p className="text-sm text-muted-foreground">Notes and plot points for the open scene appear here.</p>
      </RightPanel>
    );
  }

  const notes = requestedNotes && active.id === requested ? requestedNotes : await listSceneNotes(user.id, projectId, active.id);
  const scenes = sceneOrder(nodes).map((n) => ({ id: n.id, title: n.title }));
  return <SceneNotesPanel key={active.id} projectId={projectId} sceneId={active.id} notes={notes} plot={plot} scenes={scenes} />;
}

export default function SceneNotesSlot(props: SlotProps) {
  return (
    <PendingSwitch kind="scene" fallback={<NotesSkeleton title="Scene details" />}>
      <Suspense fallback={<NotesSkeleton title="Scene details" />}>
        <NotesLoader params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </PendingSwitch>
  );
}
