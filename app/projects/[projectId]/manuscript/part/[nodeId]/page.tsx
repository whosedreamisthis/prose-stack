import { Suspense } from "react";
import { NodeBookView } from "@/components/manuscript/NodeBookView";

export default function PartPage(props: PageProps<"/projects/[projectId]/manuscript/part/[nodeId]">) {
  return (
    <Suspense fallback={null}>
      <NodeBookView params={props.params} type="PART" />
    </Suspense>
  );
}
