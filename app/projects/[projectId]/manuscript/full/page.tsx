import { Suspense } from "react";
import { PendingNodeSwitch } from "@/components/layout/PendingNodeSwitch";
import { EditorSkeleton } from "@/components/manuscript/EditorSkeleton";
import { NodeBookView } from "@/components/manuscript/NodeBookView";

export default function FullManuscriptPage(props: PageProps<"/projects/[projectId]/manuscript/full">) {
  return (
    <PendingNodeSwitch fallback={<EditorSkeleton />}>
      <Suspense fallback={<EditorSkeleton />}>
        <NodeBookView params={props.params} type="BOOK" />
      </Suspense>
    </PendingNodeSwitch>
  );
}
