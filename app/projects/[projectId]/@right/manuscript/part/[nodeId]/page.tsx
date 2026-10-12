import { Suspense } from "react";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { PendingNodeSwitch } from "@/components/layout/PendingNodeSwitch";
import { NodeDetailsLoader } from "@/components/manuscript/NodeDetailsLoader";

export default function PartDetailsSlot(props: PageProps<"/projects/[projectId]/manuscript/part/[nodeId]">) {
  return (
    <PendingNodeSwitch fallback={<NotesSkeleton title="Part details" tabs />}>
      <Suspense fallback={<NotesSkeleton title="Part details" tabs />}>
        <NodeDetailsLoader params={props.params} type="PART" />
      </Suspense>
    </PendingNodeSwitch>
  );
}
