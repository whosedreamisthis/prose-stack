/** A Tiptap/ProseMirror document or node, as stored in `ManuscriptNode.content`. */
export interface DocNode {
  type?: string;
  text?: string;
  content?: DocNode[];
  marks?: { type: string }[];
  attrs?: Record<string, unknown>;
}

const BLOCK_TYPES = new Set(["paragraph", "heading", "blockquote", "listItem", "codeBlock", "horizontalRule"]);

/** Plain text with a newline after each block, so words never run together across paragraphs. */
export function extractText(node: DocNode | null | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const inner = (node.content ?? []).map(extractText).join("");
  return node.type && BLOCK_TYPES.has(node.type) ? `${inner}\n` : inner;
}

export function countWords(text: string) {
  const matches = text.match(/\S+/g);
  return matches ? matches.length : 0;
}

export function countDocWords(doc: DocNode | null | undefined) {
  return countWords(extractText(doc));
}

export function emptyDoc(): DocNode {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function docFromText(text: string): DocNode {
  return { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] };
}

/** Sentence-sized chunks for speech synthesis, which cuts off long utterances in some browsers. */
export function chunkText(text: string, maxLength = 200): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]*\s*/g) ?? [];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length > maxLength) {
      chunks.push(current.trim());
      current = "";
    }
    current += sentence;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
