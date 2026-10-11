const WORD_CHAR = /[\p{L}\p{N}'’-]/u;

/** The word around `offset` in `text` (the cursor can sit at either edge), or null when there is none. */
export function wordRangeAt(text: string, offset: number): { from: number; to: number } | null {
  let from = offset;
  let to = offset;
  while (from > 0 && WORD_CHAR.test(text[from - 1])) from -= 1;
  while (to < text.length && WORD_CHAR.test(text[to])) to += 1;
  return from === to ? null : { from, to };
}

/** Splits a selection like `"Happy,"` into the punctuation around it and the word itself. */
export function splitWord(selection: string) {
  const match = selection.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u);
  return { before: match?.[1] ?? "", word: match?.[2] ?? selection, after: match?.[3] ?? "" };
}

/** The text to put back for `original` when the writer picks `synonym`: same punctuation, same first-letter case. */
export function applySynonym(original: string, synonym: string) {
  const { before, word, after } = splitWord(original);
  const first = word.charAt(0);
  const capitalised = first !== "" && first === first.toUpperCase() && first !== first.toLowerCase();
  const next = capitalised ? synonym.charAt(0).toUpperCase() + synonym.slice(1) : synonym;
  return `${before}${next}${after}`;
}
