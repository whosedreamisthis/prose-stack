import { Suspense } from "react";
import { NodeBookView } from "@/components/manuscript/NodeBookView";

export default function ChapterPage(props: PageProps<"/projects/[projectId]/manuscript/chapter/[nodeId]">) {
  return (
    <Suspense fallback={null}>
      <NodeBookView params={props.params} type="CHAPTER" />
    </Suspense>
  );
}
