import { unified } from "unified";
import retextContractions from "retext-contractions";
import retextEnglish from "retext-english";
import retextIndefiniteArticle from "retext-indefinite-article";
import retextPassive from "retext-passive";
import retextRepeatedWords from "retext-repeated-words";
import { VFile } from "vfile";
import {
  LONG_SENTENCE_WORDS,
  RULE_CATEGORY,
  type IgnoreKind,
  type ProofreadCategory,
  type ProofreadRule,
  type QuoteStyle,
} from "@/lib/proofread/config";
import { dialogueSpans, inDialogue, quoteMismatches } from "@/lib/proofread/quotes";
import type { IgnoreEntry, Suggestion } from "@/lib/proofread/types";

export interface CheckOptions {
  categories: ProofreadCategory[];
  /** Names of the project's characters and places, for the consistency check. */
  names: string[];
  ignore: IgnoreEntry[];
  /** The scene's dominant quote style when it mixes both, otherwise null. */
  quotes: QuoteStyle | null;
}

/** Words that add little. Taken out only when that leaves a sentence that still reads. */
const FILLER = ["just", "really", "very", "quite", "actually", "basically", "literally", "simply", "totally", "somewhat"];
const FILLER_PATTERN = new RegExp(`\\b(${FILLER.join("|")})\\b`, "gi");

/** A capitalised word, with an inner apostrophe or hyphen allowed. */
const CAPITALISED = /\p{Lu}\p{L}*(?:[’'-]\p{L}+)*/gu;

/** The shortest name that is compared against similar-looking words, so a short name does not flag every common word. */
const MIN_NAME_LENGTH = 5;

function makeProcessor(smartApostrophes: boolean) {
  return unified()
    .use(retextEnglish)
    .use(retextRepeatedWords)
    .use(retextPassive)
    .use(retextIndefiniteArticle)
    .use(retextContractions, { straight: !smartApostrophes });
}

const processors = new Map<boolean, ReturnType<typeof makeProcessor>>();
function processorFor(smart: boolean) {
  let processor = processors.get(smart);
  if (!processor) {
    processor = makeProcessor(smart);
    processors.set(smart, processor);
  }
  return processor;
}

/** The edit distance between two words, counting a swap of neighbours as one edit. */
export function editDistance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
    }
  }
  return rows[a.length][b.length];
}

function suggestion(
  rule: ProofreadRule,
  block: number,
  text: string,
  from: number,
  to: number,
  message: string,
  replacement: string | null,
  ignore: { kind: IgnoreKind; value: string },
): Suggestion {
  return {
    id: `${block}:${from}:${rule}`,
    rule,
    category: RULE_CATEGORY[rule],
    block,
    from,
    to,
    text: text.slice(from, to),
    message,
    replacement,
    ignore,
  };
}

const wordIgnore = (value: string) => ({ kind: "WORD" as const, value: value.toLowerCase() });
const ruleIgnore = (value: ProofreadRule) => ({ kind: "RULE" as const, value });

/** Retext's own rules: repeated words, a/an, apostrophes and passive voice. */
async function retextFindings(text: string, block: number, smartApostrophes: boolean): Promise<Suggestion[]> {
  const processor = processorFor(smartApostrophes);
  const file = new VFile(text);
  await processor.run(processor.parse(file), file);
  const found: Suggestion[] = [];
  for (const message of file.messages) {
    const start = message.place && "start" in message.place ? message.place.start?.offset : message.place?.offset;
    const end = message.place && "end" in message.place ? message.place.end?.offset : undefined;
    if (start == null || end == null || end <= start) continue;
    const flagged = text.slice(start, end);
    const first = message.expected?.[0];
    switch (message.source) {
      case "retext-repeated-words": {
        const word = String(message.ruleId ?? flagged);
        found.push(suggestion("repeated-word", block, text, start, end, `The word “${word}” is repeated.`, first ?? null, wordIgnore(word)));
        break;
      }
      case "retext-indefinite-article":
        found.push(suggestion("article", block, text, start, end, `Use “${first ?? "a/an"}” instead of “${flagged}” here.`, first ?? null, ruleIgnore("article")));
        break;
      case "retext-contractions":
        found.push(suggestion("apostrophe", block, text, start, end, `Missing apostrophe in “${flagged}”.`, first ?? null, wordIgnore(flagged)));
        break;
      case "retext-passive":
        found.push(suggestion("passive", block, text, start, end, `“${flagged}” may be passive voice. Consider who is acting.`, null, ruleIgnore("passive")));
        break;
    }
  }
  return found;
}

/** Two or more spaces in a row after a word (indentation at the start of a paragraph is left alone). */
function spaceFindings(text: string, block: number): Suggestion[] {
  return [...text.matchAll(/(?<=\S) {2,}/g)].map((match) =>
    suggestion("double-space", block, text, match.index, match.index + match[0].length, "Two spaces in a row.", " ", ruleIgnore("double-space")),
  );
}

function fillerFindings(text: string, block: number): Suggestion[] {
  const found: Suggestion[] = [];
  for (const match of text.matchAll(FILLER_PATTERN)) {
    const start = match.index;
    const word = match[0];
    const atSentenceStart = /(^|[.!?…]["”’)]*\s+)$/.test(text.slice(0, start));
    const hasSpace = text[start + word.length] === " ";
    // Removing the word and the space after it leaves a sentence that reads, except at the start of a sentence.
    const end = start + word.length + (hasSpace && !atSentenceStart ? 1 : 0);
    found.push(suggestion("filler", block, text, start, end, `“${word.toLowerCase()}” adds little here.`, atSentenceStart ? null : "", wordIgnore(word)));
  }
  return found;
}

function longSentenceFindings(text: string, block: number): Suggestion[] {
  const found: Suggestion[] = [];
  for (const match of text.matchAll(/[^.!?…]+[.!?…]*["”’)]*/g)) {
    const raw = match[0];
    const lead = raw.length - raw.trimStart().length;
    const sentence = raw.trim();
    const words = sentence.split(/\s+/).filter((w) => /\p{L}/u.test(w)).length;
    if (words <= LONG_SENTENCE_WORDS) continue;
    const from = match.index + lead;
    found.push(suggestion("long-sentence", block, text, from, from + sentence.length, `This sentence is ${words} words long. Consider splitting it.`, null, ruleIgnore("long-sentence")));
  }
  return found;
}

function nameFindings(text: string, block: number, tokens: string[]): Suggestion[] {
  if (tokens.length === 0) return [];
  const known = new Set(tokens);
  const found: Suggestion[] = [];
  for (const match of text.matchAll(CAPITALISED)) {
    const word = match[0].replace(/[’']s$/, "");
    if (known.has(word) || word.length < MIN_NAME_LENGTH - 1) continue;
    const close = tokens.find((t) => Math.abs(t.length - word.length) <= 1 && editDistance(t, word) === 1);
    if (!close) continue;
    const start = match.index;
    found.push(suggestion("name-variant", block, text, start, start + word.length, `“${word}” looks like “${close}”.`, close, wordIgnore(word)));
  }
  return found;
}

function quoteFindings(text: string, block: number, style: QuoteStyle): Suggestion[] {
  const message = style === "curly" ? "Straight quote in a scene that uses curly quotes." : "Curly quote in a scene that uses straight quotes.";
  return quoteMismatches(text, style).map(({ at, replacement }) => suggestion("quotes", block, text, at, at + 1, message, replacement, ruleIgnore("quotes")));
}

/** The name parts worth comparing: each word of each name, long enough that a near miss is meaningful. */
export function nameTokens(names: string[]): string[] {
  const tokens = new Set<string>();
  for (const name of names) {
    for (const part of name.split(/\s+/)) {
      const word = part.replace(/[^\p{L}’'-]/gu, "");
      if (word.length >= MIN_NAME_LENGTH) tokens.add(word);
    }
  }
  return [...tokens];
}

/**
 * Checks paragraphs one by one (a rule never reaches across paragraphs, so a result's offsets are into its own
 * paragraph). Dialogue is left alone by the style rules. Suggestions the writer ignored are dropped.
 */
export async function checkBlocks(blocks: string[], options: CheckOptions): Promise<Suggestion[]> {
  const { categories, ignore } = options;
  const want = new Set(categories);
  const tokens = want.has("consistency") ? nameTokens(options.names) : [];
  const ignored = new Set(ignore.map((i) => `${i.kind}:${i.value}`));
  const all: Suggestion[] = [];

  for (let block = 0; block < blocks.length; block++) {
    const text = blocks[block];
    if (!text.trim()) continue;
    const spoken = dialogueSpans(text);
    const found: Suggestion[] = [];
    if (want.has("usage") || want.has("style")) found.push(...(await retextFindings(text, block, options.quotes === "curly" || text.includes("’"))));
    if (want.has("usage")) found.push(...spaceFindings(text, block));
    if (want.has("style")) found.push(...fillerFindings(text, block), ...longSentenceFindings(text, block));
    if (want.has("consistency")) {
      found.push(...nameFindings(text, block, tokens));
      if (options.quotes) found.push(...quoteFindings(text, block, options.quotes));
    }
    for (const s of found) {
      if (!want.has(s.category)) continue;
      if (s.category === "style" && inDialogue(spoken, s.from)) continue;
      if (ignored.has(`${s.ignore.kind}:${s.ignore.value}`)) continue;
      all.push(s);
    }
  }

  // The same range can be found twice (a repeated word that is also a filler); keep the first.
  const seen = new Set<string>();
  return all
    .sort((a, b) => a.block - b.block || a.from - b.from)
    .filter((s) => {
      const key = `${s.block}:${s.from}:${s.to}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
