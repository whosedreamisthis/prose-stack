import { Suspense } from "react";
import { NotesSkeleton } from "@/components/characters/NotesSkeleton";
import { NodeDetailsLoader } from "@/components/manuscript/NodeDetailsLoader";

export default function ChapterDetailsSlot(props: PageProps<"/projects/[projectId]/manuscript/chapter/[nodeId]">) {
  return (
    <Suspense fallback={<NotesSkeleton title="Chapter details" />}>
      <NodeDetailsLoader params={props.params} type="CHAPTER" />
    </Suspense>
  );
}
