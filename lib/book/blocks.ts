import type { DocNode } from "@/lib/manuscript-text";

export interface FontStyle {
  bold?: boolean;
  italic?: boolean;
}

export interface Run extends FontStyle {
  text: string;
}
export interface Block {
  runs: Run[];
  /** Quoted and list text is indented, in points. */
  indent: number;
}

/** The separator between two scenes: three centered, spaced asterisks. Shared by the PDF and the book view. */
export const SCENE_BREAK = "*     *     *";

const BLOCK_TYPES = new Set(["paragraph", "heading", "codeBlock"]);
const NESTING_TYPES = new Set(["blockquote", "bulletList", "orderedList"]);

function inlineRuns(node: DocNode, style: FontStyle, out: Run[]) {
  if (node.type === "text") {
    const marks = new Set((node.marks ?? []).map((m) => m.type));
    if (node.text) out.push({ text: node.text, bold: style.bold || marks.has("bold"), italic: style.italic || marks.has("italic") });
    return;
  }
  if (node.type === "hardBreak") {
    out.push({ text: "\n", ...style });
    return;
  }
  for (const child of node.content ?? []) inlineRuns(child, style, out);
}

/** A scene's blocks (paragraphs, headings, quotes, list items), each with its styled runs. */
export function sceneBlocks(doc: DocNode | null | undefined, indent = 0): Block[] {
  if (!doc) return [];
  if (doc.type && BLOCK_TYPES.has(doc.type)) {
    const runs: Run[] = [];
    inlineRuns(doc, doc.type === "heading" ? { bold: true } : {}, runs);
    return [{ runs, indent }];
  }
  if (doc.type === "horizontalRule") return [{ runs: [{ text: "* * *" }], indent: 0 }];
  const next = doc.type && NESTING_TYPES.has(doc.type) ? indent + 24 : indent;
  return (doc.content ?? []).flatMap((child) => sceneBlocks(child, next));
}

