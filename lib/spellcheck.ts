export interface WordRange {
  from: number;
  to: number;
  word: string;
}

/** Letters, with apostrophes (straight or curly) allowed inside a word: "don't", "writer’s". */
const WORD = /\p{L}+(?:['’]\p{L}+)*/gu;

/** Words in `text` with their offsets. Hyphenated words come back as separate words. */
export function findWords(text: string): WordRange[] {
  const words: WordRange[] = [];
  for (const m of text.matchAll(WORD)) words.push({ from: m.index, to: m.index + m[0].length, word: m[0] });
  return words;
}

/** One-letter words and ALL CAPS words (initials, acronyms) are not worth flagging. */
export function shouldSkip(word: string): boolean {
  if (word.length < 2) return true;
  return word === word.toUpperCase() && word !== word.toLowerCase();
}

/** The form the dictionary expects: curly apostrophes made straight. */
export function normalizeWord(word: string): string {
  return word.replace(/’/g, "'");
}

/**
 * Puts the suggestions that only add the missing apostrophe first ("Dont" -> "Don't"), because a writer who left one out
 * almost always means that word, while the dictionary lists it among a dozen similar-looking ones.
 */
export function rankSuggestions(word: string, suggestions: string[]): string[] {
  const plain = normalizeWord(word).toLowerCase();
  const restored = (s: string) => s.includes("'") && s.replace(/'/g, "").toLowerCase() === plain;
  return [...suggestions.filter(restored), ...suggestions.filter((s) => !restored(s))];
}

/** Gives a suggestion the capital letter of the word it replaces: "teh" -> "the", "Teh" -> "The". */
export function matchCase(original: string, suggestion: string): string {
  const first = original.charAt(0);
  const capitalised = first !== first.toLowerCase() && original.slice(1) === original.slice(1).toLowerCase();
  if (!capitalised) return suggestion;
  return suggestion.charAt(0).toUpperCase() + suggestion.slice(1);
}
