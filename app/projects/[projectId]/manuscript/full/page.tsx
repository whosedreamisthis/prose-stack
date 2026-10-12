import { Suspense } from "react";
import { NodeBookView } from "@/components/manuscript/NodeBookView";

export default function FullManuscriptPage(props: PageProps<"/projects/[projectId]/manuscript/full">) {
  return (
    <Suspense fallback={null}>
      <NodeBookView params={props.params} type="BOOK" />
    </Suspense>
  );
}
