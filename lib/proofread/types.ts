import type { IgnoreKind, ProofreadCategory, ProofreadRule } from "@/lib/proofread/config";

/** One thing the checker found. `from` and `to` are offsets into paragraph `block`'s text. */
export interface Suggestion {
  id: string;
  rule: ProofreadRule;
  category: ProofreadCategory;
  block: number;
  from: number;
  to: number;
  /** The flagged text, so the editor can tell if it has moved. */
  text: string;
  message: string;
  /** What to put in its place; "" removes the text; null means the writer has to decide. */
  replacement: string | null;
  /** What "Ignore always" adds to the project's list. */
  ignore: { kind: IgnoreKind; value: string };
}

export interface IgnoreEntry {
  kind: IgnoreKind;
  value: string;
}
