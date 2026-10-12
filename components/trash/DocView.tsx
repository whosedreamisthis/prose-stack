import type { ReactNode } from "react";
import type { DocNode } from "@/lib/manuscript-text";

function renderInline(node: DocNode, key: number): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;
  let out: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") out = <strong>{out}</strong>;
    else if (mark.type === "italic") out = <em>{out}</em>;
  }
  return <span key={key}>{out}</span>;
}

/** A manuscript document as read-only text. The editor only allows paragraphs, bold and italic, and that is all this draws. */
export function DocView({ doc }: { doc: DocNode }) {
  const blocks = doc.content ?? [];
  if (blocks.every((b) => !b.content?.length)) return <p className="text-muted-foreground italic">This scene is empty.</p>;
  return (
    <div className="font-serif leading-relaxed">
      {blocks.map((block, i) => (
        <p key={i} className="mb-[0.9em] min-h-[1em]">
          {(block.content ?? []).map(renderInline)}
        </p>
      ))}
    </div>
  );
}
