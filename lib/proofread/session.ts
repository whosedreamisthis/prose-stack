import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import { toast } from "sonner";
import { ALL_CATEGORIES, CHUNK_CHARS, MAX_BLOCKS, MAX_BLOCK_LENGTH } from "@/lib/proofread/config";
import { dominantQuoteStyle } from "@/lib/proofread/quotes";
import type { Suggestion } from "@/lib/proofread/types";
import { proofreadRanges } from "@/lib/proofread-extension";
import { useProofreadStore, type ProofreadItem } from "@/lib/stores/proofread-store";

/** One paragraph of the scene: its text, and the document position of its first character. */
export interface TextBlock {
  start: number;
  text: string;
}

/** How much of the surrounding text the panel shows around a suggestion. */
const CONTEXT_CHARS = 36;

/**
 * A paragraph's text with one character per document position. Anything that is not text (a line break) becomes a newline,
 * so it is never mistaken for a typed space.
 */
function paragraphText(block: PMNode): string {
  let text = "";
  block.forEach((child) => {
    text += child.isText ? child.text : "\n".repeat(child.nodeSize);
  });
  return text;
}

/**
 * The paragraphs of a document between two positions. A paragraph the range only partly covers is cut to the range.
 * The text has one character per document position, so an offset in it is an offset in the document.
 */
export function collectBlocks(doc: PMNode, from: number, to: number): TextBlock[] {
  const blocks: TextBlock[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    const start = pos + 1;
    const end = start + node.content.size;
    if (end > from && start < to) {
      const cutFrom = Math.max(from, start);
      const text = paragraphText(node).slice(cutFrom - start, Math.min(to, end) - start);
      if (text.trim()) blocks.push({ start: cutFrom, text });
    }
    return false;
  });
  return blocks;
}

/** Groups paragraphs into requests of about CHUNK_CHARS characters. */
export function chunkBlocks(blocks: TextBlock[]): TextBlock[][] {
  const chunks: TextBlock[][] = [];
  let current: TextBlock[] = [];
  let size = 0;
  for (const block of blocks) {
    if (current.length > 0 && (size + block.text.length > CHUNK_CHARS || current.length >= MAX_BLOCKS)) {
      chunks.push(current);
      current = [];
      size = 0;
    }
    current.push(block);
    size += block.text.length;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

let controller: AbortController | null = null;

export function cancelProofread() {
  controller?.abort();
}

/** Forgets the results and their underlines, and stops a run in progress. */
export function clearProofread(editor?: Editor | null) {
  cancelProofread();
  // The scene that was proofread may not be the one being cleared from (a chapter page has several editors).
  for (const target of new Set([editor, useProofreadStore.getState().owner])) {
    if (target && !target.isDestroyed) target.commands.clearProofreadMarks();
  }
  useProofreadStore.getState().reset();
}

async function requestChunk(projectId: string, blocks: string[], quotes: "straight" | "curly" | null, signal: AbortSignal): Promise<Suggestion[]> {
  const response = await fetch("/api/proofread", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, blocks, categories: ALL_CATEGORIES, quotes }),
    signal,
  });
  const body = (await response.json().catch(() => null)) as { suggestions?: Suggestion[]; error?: string } | null;
  if (!response.ok || !body?.suggestions) throw new Error(body?.error ?? "Proofreading failed. Please try again.");
  return body.suggestions;
}

/**
 * Proofreads the selection, or the whole scene when nothing is selected. Long scenes go in several requests with
 * progress; the run can be cancelled. Results go to the store and, as underlines, to the editor.
 */
export async function startProofread(editor: Editor, projectId: string) {
  const store = useProofreadStore.getState();
  if (store.status === "running" || editor.isDestroyed) return;

  const { doc, selection } = editor.state;
  const scope = selection.empty ? "scene" : "selection";
  const all = collectBlocks(doc, 0, doc.content.size);
  const checked = scope === "scene" ? all : collectBlocks(doc, selection.from, selection.to);
  const tooLong = checked.filter((b) => b.text.length > MAX_BLOCK_LENGTH).length;
  const blocks = checked.filter((b) => b.text.length <= MAX_BLOCK_LENGTH);
  if (blocks.length === 0) {
    toast.message(scope === "scene" ? "There is no text to proofread yet." : "Select some text to proofread it.");
    return;
  }

  // Quote style is judged over the whole scene, even when only part of it is checked.
  const quotes = dominantQuoteStyle(all.map((b) => b.text));
  const chunks = chunkBlocks(blocks);

  clearProofread(editor);
  store.begin(scope, chunks.length, editor);

  controller = new AbortController();
  const { signal } = controller;
  const startDoc = doc;
  const items: ProofreadItem[] = [];
  const marks: { id: string; from: number; to: number; text: string; category: Suggestion["category"] }[] = [];

  try {
    let offset = 0;
    for (const [i, chunk] of chunks.entries()) {
      const found = await requestChunk(projectId, chunk.map((b) => b.text), quotes, signal);
      for (const s of found) {
        const block = chunk[s.block];
        if (!block) continue;
        const global = offset + s.block;
        const id = `${global}:${s.from}:${s.rule}`;
        const from = block.start + s.from;
        const to = block.start + s.to;
        marks.push({ id, from, to, text: s.text, category: s.category });
        items.push({
          ...s,
          id,
          block: global,
          before: block.text.slice(Math.max(0, s.from - CONTEXT_CHARS), s.from),
          after: block.text.slice(s.to, s.to + CONTEXT_CHARS),
        });
      }
      offset += chunk.length;
      useProofreadStore.getState().setProgress(i + 1);
    }

    // If the scene was edited while it was being checked, keep only what still matches the text it was found in.
    const changedDuringRun = editor.state.doc !== startDoc;
    let kept = marks;
    if (changedDuringRun) {
      const current = editor.state.doc;
      kept = marks.filter((m) => m.to <= current.content.size && current.textBetween(m.from, m.to, " ", " ") === m.text);
    }
    const keptIds = new Set(kept.map((m) => m.id));
    editor.commands.setProofreadMarks(kept);
    editor.commands.setProofreadHidden(ALL_CATEGORIES.filter((c) => !useProofreadStore.getState().categories.includes(c)));
    useProofreadStore.getState().finish(items.filter((i) => keptIds.has(i.id)), { changedDuringRun, skipped: tooLong });
  } catch (error) {
    if (signal.aborted) {
      useProofreadStore.getState().reset();
      return;
    }
    useProofreadStore.getState().fail(error instanceof Error ? error.message : "Proofreading failed. Please try again.");
  } finally {
    controller = null;
  }
}

/** Puts the caret at a suggestion and scrolls it into view, drawing it stronger than the rest. It does not select the text, so the next run still checks the whole scene. */
export function showSuggestion(editor: Editor, id: string) {
  const range = proofreadRanges(editor.state).get(id);
  useProofreadStore.getState().setActive(id);
  editor.commands.setActiveProofread(id);
  if (range) editor.chain().setTextSelection(range.from).scrollIntoView().run();
}
