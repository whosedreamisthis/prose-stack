import { z } from "zod";
import { projectIdSchema } from "@/lib/project-config";

export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;
export const MAX_RESULTS = 50;
const MAX_WORDS = 12;
const SNIPPET_BEFORE = 40;
const SNIPPET_AFTER = 80;

export const searchScenesSchema = z.object({
  projectId: projectIdSchema,
  query: z
    .string()
    .trim()
    .min(MIN_QUERY_LENGTH, `Type at least ${MIN_QUERY_LENGTH} characters`)
    .max(MAX_QUERY_LENGTH, `Search for ${MAX_QUERY_LENGTH} characters or fewer`),
});

/** One word of the search: lower-cased, accents removed. `prefix` is a trailing `*` (light* finds lighthouse). */
export interface SearchWord {
  text: string;
  prefix: boolean;
}

/** A word typed on its own, or the words of a "quoted phrase", which must sit next to each other in order. */
export type SearchUnit = SearchWord[];

export interface SnippetPart {
  text: string;
  match: boolean;
}

export type MatchedIn = "title" | "label" | "summary" | "text";

export interface SceneSearchResult {
  id: string;
  matchedIn: MatchedIn;
  /** A short stretch of text around the first match; the opening of the scene when only its label matched. */
  snippet: SnippetPart[];
  snippetBefore: boolean;
  snippetAfter: boolean;
}

export interface SceneSearchData {
  results: SceneSearchResult[];
  /** Every scene that matched, which can be more than the results shown. */
  total: number;
  units: SearchUnit[];
}

/** Lower case, accents removed: the same folding the database does with unaccent, so both sides agree. */
export function foldText(text: string) {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/**
 * Splits what was typed into words and quoted phrases. Only letters and digits survive, so nothing typed can become
 * query syntax; an unfinished quote is treated as a phrase to the end.
 */
export function parseSearchQuery(raw: string): SearchUnit[] {
  const units: SearchUnit[] = [];
  let words = 0;
  const chunks = raw.matchAll(/"([^"]*)"?|([^\s"]+)/gu);
  for (const chunk of chunks) {
    const phrase = chunk[1] !== undefined;
    const found: SearchWord[] = [];
    for (const m of (chunk[1] ?? chunk[2]).matchAll(/([\p{L}\p{N}]+)(\*)?/gu)) {
      if (words + found.length >= MAX_WORDS) break;
      found.push({ text: foldText(m[1]), prefix: m[2] === "*" });
    }
    if (found.length === 0) continue;
    words += found.length;
    if (phrase) units.push(found);
    else for (const word of found) units.push([word]);
    if (words >= MAX_WORDS) break;
  }
  return units;
}

function tsWord(word: SearchWord) {
  return `${word.text}${word.prefix ? ":*" : ""}`;
}

/** The text for Postgres `to_tsquery`: every unit must match; a phrase's words follow one another. */
export function toTsQuery(units: SearchUnit[]) {
  return units.map((unit) => `(${unit.map(tsWord).join(" <-> ")})`).join(" & ");
}

/** The same words joined with OR, to tell which field a scene matched in first. */
export function toTsQueryAny(units: SearchUnit[]) {
  return units.flatMap((unit) => unit.map(tsWord)).join(" | ");
}

function wordMatches(folded: string, units: SearchUnit[]) {
  return units.some((unit) => unit.some((w) => (w.prefix ? folded.startsWith(w.text) : folded === w.text)));
}

/** The text split into matching and non-matching parts, matching whole words (or prefixes) as the search does. */
export function highlightText(text: string, units: SearchUnit[]): SnippetPart[] {
  const parts: SnippetPart[] = [];
  let last = 0;
  for (const m of text.matchAll(/[\p{L}\p{N}]+/gu)) {
    if (!wordMatches(foldText(m[0]), units)) continue;
    if (m.index > last) parts.push({ text: text.slice(last, m.index), match: false });
    parts.push({ text: m[0], match: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

/** Whether any searched word appears in the text (used to mark a label that matched). */
export function textMatches(text: string, units: SearchUnit[]) {
  return highlightText(text, units).some((p) => p.match);
}

/** About 120 characters around the first match, starting and ending on word boundaries. */
export function buildSnippet(text: string, units: SearchUnit[]) {
  const flat = text.replace(/\s+/g, " ").trim();
  let first = -1;
  for (const m of flat.matchAll(/[\p{L}\p{N}]+/gu)) {
    if (wordMatches(foldText(m[0]), units)) {
      first = m.index;
      break;
    }
  }
  let start = first === -1 ? 0 : Math.max(0, first - SNIPPET_BEFORE);
  let end = Math.min(flat.length, (first === -1 ? 0 : first) + SNIPPET_AFTER + (first === -1 ? SNIPPET_BEFORE : 0));
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    if (space !== -1 && space < first) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    if (space > start) end = space;
  }
  return {
    parts: highlightText(flat.slice(start, end), units),
    before: start > 0,
    after: end < flat.length,
  };
}

const BUCKET_ORDER: MatchedIn[] = ["title", "label", "summary", "text"];

export function matchedInFromBucket(bucket: number): MatchedIn {
  return BUCKET_ORDER[bucket] ?? "text";
}
