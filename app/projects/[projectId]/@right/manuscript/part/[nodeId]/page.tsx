import { Suspense } from "react";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { NodeDetailsLoader } from "@/components/manuscript/NodeDetailsLoader";

export default function PartDetailsSlot(props: PageProps<"/projects/[projectId]/manuscript/part/[nodeId]">) {
  return (
    <Suspense fallback={<NotesSkeleton title="Part details" />}>
      <NodeDetailsLoader params={props.params} type="PART" />
    </Suspense>
  );
}
