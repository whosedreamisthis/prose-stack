import { useSyncExternalStore } from "react";
import nspell from "nspell";
import { normalizeWord } from "@/lib/spellcheck";

export type SpellStatus = "idle" | "loading" | "ready" | "error";

const DICTIONARY_PATHS = { aff: "/dictionaries/en/en.aff", dic: "/dictionaries/en/en.dic" };
const CUSTOM_WORDS_KEY = "prosestack-custom-words";

type Speller = ReturnType<typeof nspell>;

let speller: Speller | null = null;
let status: SpellStatus = "idle";
const listeners = new Set<() => void>();
/** Words ignored for this session only. */
const ignored = new Set<string>();

function emit() {
  for (const listener of listeners) listener();
}

function setStatus(next: SpellStatus) {
  status = next;
  emit();
}

function readCustomWords(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CUSTOM_WORDS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((w): w is string => typeof w === "string") : [];
  } catch {
    return [];
  }
}

function writeCustomWords(words: string[]) {
  try {
    localStorage.setItem(CUSTOM_WORDS_KEY, JSON.stringify(words));
  } catch {
    // Storage is blocked: the word still counts for this session.
  }
}

/** Starts loading the dictionary (once). Safe to call from every editor. */
export function loadSpellEngine() {
  if (status !== "idle" || typeof window === "undefined") return;
  setStatus("loading");
  Promise.all([fetch(DICTIONARY_PATHS.aff), fetch(DICTIONARY_PATHS.dic)])
    .then(async ([aff, dic]) => {
      if (!aff.ok || !dic.ok) throw new Error("dictionary missing");
      const loaded = nspell({ aff: await aff.text(), dic: await dic.text() });
      for (const word of readCustomWords()) loaded.add(word);
      speller = loaded;
      setStatus("ready");
    })
    .catch(() => setStatus("error"));
}

export function isMisspelled(word: string): boolean {
  if (!speller) return false;
  const normal = normalizeWord(word);
  return !ignored.has(normal.toLowerCase()) && !speller.correct(normal);
}

export function suggestFor(word: string, limit = 5): string[] {
  return speller ? speller.suggest(normalizeWord(word)).slice(0, limit) : [];
}

/** Remembers the word in this browser, so it is never flagged again. */
export function addToDictionary(word: string) {
  const normal = normalizeWord(word);
  speller?.add(normal);
  const words = readCustomWords();
  if (!words.includes(normal)) writeCustomWords([...words, normal]);
  emit();
}

/** Stops flagging the word until the page reloads. */
export function ignoreWord(word: string) {
  ignored.add(normalizeWord(word).toLowerCase());
  emit();
}

export function subscribeSpell(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The dictionary's load state, for components. */
export function useSpellStatus(): SpellStatus {
  return useSyncExternalStore(
    subscribeSpell,
    () => status,
    () => "idle",
  );
}
