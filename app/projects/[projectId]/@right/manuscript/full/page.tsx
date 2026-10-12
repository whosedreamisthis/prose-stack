import { Suspense } from "react";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { PendingNodeSwitch } from "@/components/layout/PendingNodeSwitch";
import { NodeDetailsLoader } from "@/components/manuscript/NodeDetailsLoader";

export default function ManuscriptDetailsSlot(props: PageProps<"/projects/[projectId]/manuscript/full">) {
  return (
    <PendingNodeSwitch fallback={<NotesSkeleton title="Manuscript details" />}>
      <Suspense fallback={<NotesSkeleton title="Manuscript details" />}>
        <NodeDetailsLoader params={props.params} type="BOOK" />
      </Suspense>
    </PendingNodeSwitch>
  );
}
