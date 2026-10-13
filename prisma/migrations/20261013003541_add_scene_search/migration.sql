-- Accent-insensitive search needs unaccent; a generated column needs an IMMUTABLE wrapper around it.
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- AlterTable
ALTER TABLE "ManuscriptNode" ADD COLUMN "plainText" TEXT;

-- Backfill: every "text" node of a scene's Tiptap document, in order, separated by spaces.
UPDATE "ManuscriptNode"
SET "plainText" = (
  SELECT string_agg(t #>> '{}', ' ')
  FROM jsonb_path_query("content"::jsonb, 'lax $.**.text') AS t
)
WHERE "type" = 'SCENE' AND "content" IS NOT NULL;

-- Title (A), summary (B) and text (C), with no language-specific stemming.
ALTER TABLE "ManuscriptNode" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('simple', f_unaccent(coalesce("title", ''))), 'A') ||
  setweight(to_tsvector('simple', f_unaccent(coalesce("summary", ''))), 'B') ||
  setweight(to_tsvector('simple', f_unaccent(coalesce("plainText", ''))), 'C')
) STORED;

-- CreateIndex
CREATE INDEX "ManuscriptNode_searchVector_idx" ON "ManuscriptNode" USING GIN ("searchVector");
