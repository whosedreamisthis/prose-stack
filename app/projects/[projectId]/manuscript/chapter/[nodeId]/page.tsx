import { Suspense } from "react";
import { PendingNodeSwitch } from "@/components/layout/PendingNodeSwitch";
import { EditorSkeleton } from "@/components/manuscript/EditorSkeleton";
import { NodeBookView } from "@/components/manuscript/NodeBookView";

export default function ChapterPage(props: PageProps<"/projects/[projectId]/manuscript/chapter/[nodeId]">) {
  return (
    <PendingNodeSwitch fallback={<EditorSkeleton />}>
      <Suspense fallback={<EditorSkeleton />}>
        <NodeBookView params={props.params} type="CHAPTER" />
      </Suspense>
    </PendingNodeSwitch>
  );
}
