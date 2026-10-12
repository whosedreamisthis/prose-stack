/** Most characters in one spoken chunk. Chrome cuts off long utterances, so text is queued in pieces this size or shorter. */
export const MAX_CHUNK_LENGTH = 200;

/** Splits one paragraph into sentences, each keeping its closing punctuation and any closing quote or bracket. */
function sentences(paragraph: string): string[] {
  return paragraph.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
}

/** Breaks a piece that is still too long at spaces, so no word is split. */
function breakLong(text: string, max: number): string[] {
  const parts: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + 1 + word.length > max) {
      parts.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) parts.push(line);
  return parts;
}

/**
 * Turns scene text into the pieces to speak, in order: paragraphs (separated by line breaks) are split into sentences,
 * short sentences of one paragraph are joined up to `max` characters, and a sentence longer than `max` is broken at spaces.
 */
export function chunkText(text: string, max = MAX_CHUNK_LENGTH): string[] {
  const chunks: string[] = [];
  for (const paragraph of text.split(/\n+/)) {
    let current = "";
    for (const sentence of sentences(paragraph)) {
      const pieces = sentence.length > max ? breakLong(sentence, max) : [sentence];
      for (const piece of pieces) {
        if (current && current.length + 1 + piece.length > max) {
          chunks.push(current);
          current = piece;
        } else {
          current = current ? `${current} ${piece}` : piece;
        }
      }
    }
    if (current) chunks.push(current);
  }
  return chunks;
}
