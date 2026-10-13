import type { QuoteStyle } from "@/lib/proofread/config";

const STRAIGHT = /"/g;
const CURLY = /[“”]/g;

/**
 * The quote style most of the text uses, when both styles appear (otherwise there is nothing inconsistent, so null).
 * A tie goes to curly quotes.
 */
export function dominantQuoteStyle(blocks: string[]): QuoteStyle | null {
  let straight = 0;
  let curly = 0;
  for (const block of blocks) {
    straight += block.match(STRAIGHT)?.length ?? 0;
    curly += block.match(CURLY)?.length ?? 0;
  }
  if (straight === 0 || curly === 0) return null;
  return curly >= straight ? "curly" : "straight";
}

/** Ranges of a paragraph that are spoken: quote to quote, or to the end if the quote is left open. */
export function dialogueSpans(text: string): [number, number][] {
  const spans: [number, number][] = [];
  let open = -1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (open === -1) open = i;
      else {
        spans.push([open, i + 1]);
        open = -1;
      }
    } else if (ch === "“" && open === -1) open = i;
    else if (ch === "”" && open !== -1) {
      spans.push([open, i + 1]);
      open = -1;
    }
  }
  if (open !== -1) spans.push([open, text.length]);
  return spans;
}

export const inDialogue = (spans: [number, number][], at: number) => spans.some(([from, to]) => at >= from && at < to);

/** A straight quote opens when it follows the start, a space or an opening bracket or dash; otherwise it closes. */
const opensQuote = (text: string, at: number) => at === 0 || /[\s([{—–-]/.test(text[at - 1]);

/** The characters that do not match the scene's dominant style, each with the one to use instead. */
export function quoteMismatches(text: string, style: QuoteStyle): { at: number; replacement: string }[] {
  const found: { at: number; replacement: string }[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (style === "curly" && ch === '"') found.push({ at: i, replacement: opensQuote(text, i) ? "“" : "”" });
    if (style === "straight" && (ch === "“" || ch === "”")) found.push({ at: i, replacement: '"' });
  }
  return found;
}
