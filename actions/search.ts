"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getManuscript } from "@/lib/manuscript";
import { sceneOrder } from "@/lib/manuscript-tree";
import {
  MAX_RESULTS,
  buildSnippet,
  matchedInFromBucket,
  parseSearchQuery,
  searchScenesSchema,
  toTsQuery,
  toTsQueryAny,
  type SceneSearchData,
} from "@/lib/scene-search";
import type { ActionResult } from "@/types/actions";

const NOT_SIGNED_IN = "You need to be signed in.";

/**
 * Finds the project's scenes that contain every word typed, in the title, summary, text or label name. The words are
 * reduced to letters and digits before they reach SQL, which also receives them only as parameters. Another user's
 * project, trashed scenes and anything else out of scope simply match nothing.
 */
export async function searchScenes(input: { projectId: string; query: string }): Promise<ActionResult<SceneSearchData>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: NOT_SIGNED_IN };

    const parsed = searchScenesSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid search." };
    const { projectId, query } = parsed.data;

    const units = parseSearchQuery(query);
    if (units.length === 0) return { success: true, data: { results: [], total: 0, units } };
    const all = toTsQuery(units);
    const any = toTsQueryAny(units);

    // The label's name is read here rather than stored in the vector, so renaming or relabelling takes effect at once.
    const rows = await prisma.$queryRaw<{ id: string; bucket: number }[]>`
      WITH q AS (SELECT to_tsquery('simple', f_unaccent(${all}::text)) AS every, to_tsquery('simple', f_unaccent(${any}::text)) AS some)
      SELECT n."id",
        CASE
          WHEN to_tsvector('simple', f_unaccent(n."title")) @@ q.some THEN 0
          WHEN to_tsvector('simple', f_unaccent(coalesce(l."name", ''))) @@ q.some THEN 1
          WHEN to_tsvector('simple', f_unaccent(coalesce(n."summary", ''))) @@ q.some THEN 2
          ELSE 3
        END AS "bucket"
      FROM "ManuscriptNode" n
      JOIN "Project" p ON p."id" = n."projectId"
      LEFT JOIN "Label" l ON l."id" = n."labelId"
      CROSS JOIN q
      WHERE p."id" = ${projectId}
        AND p."userId" = ${user.id}
        AND n."type" = 'SCENE'
        AND n."trashedAt" IS NULL
        AND (n."searchVector" || to_tsvector('simple', f_unaccent(coalesce(l."name", '')))) @@ q.every
    `;

    // Best match first, then the order of the book. Reading order comes from the (cached) outline.
    const nodes = await getManuscript(user.id, projectId);
    const readingOrder = new Map(sceneOrder(nodes).map((n, i) => [n.id, i]));
    const top = rows
      .map((r) => ({ id: r.id, bucket: Number(r.bucket) }))
      .sort((a, b) => a.bucket - b.bucket || (readingOrder.get(a.id) ?? 0) - (readingOrder.get(b.id) ?? 0))
      .slice(0, MAX_RESULTS);

    const texts = await prisma.manuscriptNode.findMany({
      where: { id: { in: top.map((r) => r.id) }, projectId },
      select: { id: true, summary: true, plainText: true },
    });
    const textById = new Map(texts.map((t) => [t.id, t]));

    const results = top.map(({ id, bucket }) => {
      const text = textById.get(id);
      const matchedIn = matchedInFromBucket(bucket);
      // A summary match shows the summary; anything else shows the text (its opening when only the label matched).
      const source = matchedIn === "summary" ? (text?.summary ?? "") : (text?.plainText ?? text?.summary ?? "");
      const snippet = buildSnippet(source, units);
      return { id, matchedIn, snippet: snippet.parts, snippetBefore: snippet.before, snippetAfter: snippet.after };
    });

    return { success: true, data: { results, total: rows.length, units } };
  } catch (error) {
    console.error("searchScenes failed:", error);
    return { success: false, error: "Could not search. Please try again." };
  }
}
