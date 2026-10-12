import { Suspense } from "react";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { PendingNodeSwitch } from "@/components/layout/PendingNodeSwitch";
import { NodeDetailsLoader } from "@/components/manuscript/NodeDetailsLoader";

export default function ChapterDetailsSlot(props: PageProps<"/projects/[projectId]/manuscript/chapter/[nodeId]">) {
  return (
    <PendingNodeSwitch fallback={<NotesSkeleton title="Chapter details" tabs />}>
      <Suspense fallback={<NotesSkeleton title="Chapter details" tabs />}>
        <NodeDetailsLoader params={props.params} type="CHAPTER" />
      </Suspense>
    </PendingNodeSwitch>
  );
}
