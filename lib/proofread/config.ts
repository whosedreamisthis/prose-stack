import { z } from "zod";

export const PROOFREAD_CATEGORIES = [
  { id: "usage", label: "Punctuation and usage", hint: "Repeated words, double spaces, a/an, missing apostrophes" },
  { id: "style", label: "Style", hint: "Passive voice, filler words, very long sentences" },
  { id: "consistency", label: "Consistency", hint: "Names spelled two ways, mixed quote styles" },
] as const;

export type ProofreadCategory = (typeof PROOFREAD_CATEGORIES)[number]["id"];
export const ALL_CATEGORIES: ProofreadCategory[] = PROOFREAD_CATEGORIES.map((c) => c.id);

/** What the writer sees for each rule, and the category it belongs to. */
export const RULE_CATEGORY = {
  "repeated-word": "usage",
  article: "usage",
  apostrophe: "usage",
  "double-space": "usage",
  passive: "style",
  filler: "style",
  "long-sentence": "style",
  "name-variant": "consistency",
  quotes: "consistency",
} as const satisfies Record<string, ProofreadCategory>;

export type ProofreadRule = keyof typeof RULE_CATEGORY;

/** A sentence longer than this many words is flagged. */
export const LONG_SENTENCE_WORDS = 45;

/** Limits for one request. A longer scene is sent as several requests (see CHUNK_CHARS). */
export const MAX_BLOCKS = 300;
export const MAX_BLOCK_LENGTH = 10_000;
export const MAX_REQUEST_CHARS = 30_000;
/** The client groups paragraphs into requests of about this many characters. */
export const CHUNK_CHARS = 8_000;

/** Proofreading requests allowed per minute: one request is about 8,000 characters of the scene. */
export const RATE_LIMIT_PER_MINUTE = 30;
export const DEMO_RATE_LIMIT_PER_MINUTE = 10;

export const ignoreKindSchema = z.enum(["WORD", "RULE"]);
export type IgnoreKind = z.infer<typeof ignoreKindSchema>;

export const quoteStyleSchema = z.enum(["straight", "curly"]);
export type QuoteStyle = z.infer<typeof quoteStyleSchema>;

const idSchema = z.string().min(1).max(64);

export const proofreadRequestSchema = z.object({
  projectId: idSchema,
  blocks: z
    .array(z.string().max(MAX_BLOCK_LENGTH, "A paragraph is too long to proofread."))
    .min(1, "There is nothing to proofread.")
    .max(MAX_BLOCKS, "That is too much text for one request."),
  categories: z.array(z.enum(["usage", "style", "consistency"])).min(1, "Choose at least one category."),
  /** The scene's dominant quote style when both styles are used, otherwise null. */
  quotes: quoteStyleSchema.nullable(),
});

export const addIgnoreSchema = z.object({
  projectId: idSchema,
  kind: ignoreKindSchema,
  value: z.string().trim().min(1).max(80),
});

export const removeIgnoreSchema = z.object({ projectId: idSchema, id: idSchema });

export const IGNORE_LIMIT = 500;

export type ProofreadRequest = z.infer<typeof proofreadRequestSchema>;
