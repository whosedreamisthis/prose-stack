import { fetchSynonyms, parseThesaurusWord } from "@/lib/thesaurus";

/** Synonyms for one word, proxied from Datamuse. Behind sign-in like every non-public route (see proxy.ts). */
export async function GET(request: Request) {
  const word = parseThesaurusWord(new URL(request.url).searchParams.get("word"));
  if (!word) return Response.json({ error: "Provide a single word of up to 40 letters." }, { status: 400 });

  try {
    return Response.json({ words: await fetchSynonyms(word) });
  } catch (error) {
    console.error("thesaurus lookup failed:", error);
    return Response.json({ error: "Couldn't reach the thesaurus." }, { status: 502 });
  }
}
