export const MAX_THESAURUS_WORD_LENGTH = 40;
export const MAX_SYNONYMS = 20;

const DATAMUSE_URL = "https://api.datamuse.com/words";

/** A lookup word: letters, apostrophes and hyphens only, so nothing odd reaches the upstream query. */
export function parseThesaurusWord(raw: string | null): string | null {
  const word = raw?.trim() ?? "";
  if (!word || word.length > MAX_THESAURUS_WORD_LENGTH) return null;
  return /^[\p{L}][\p{L}'’-]*$/u.test(word) ? word : null;
}

/** Synonyms from Datamuse, at most `MAX_SYNONYMS`, without the word itself. Throws when the upstream fails. */
export async function fetchSynonyms(word: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const url = `${DATAMUSE_URL}?rel_syn=${encodeURIComponent(word)}&max=${MAX_SYNONYMS}`;
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error(`Datamuse responded ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error("Unexpected Datamuse response");
  const lower = word.toLowerCase();
  return data
    .map((entry) => (entry && typeof entry === "object" && "word" in entry ? String((entry as { word: unknown }).word) : ""))
    .filter((w) => w && w.toLowerCase() !== lower)
    .slice(0, MAX_SYNONYMS);
}
