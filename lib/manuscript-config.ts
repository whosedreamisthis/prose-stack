import { z } from "zod";

export type NodeType = "PART" | "CHAPTER" | "SCENE";

export const AUTOSAVE_IDLE_MS = 1500;
export const AUTOSAVE_MAX_WAIT_MS = 10_000;
export const WORDS_PER_PAGE = 250;

export const SEED_SCENE_TEXT = "Once upon a time...";

/** Hierarchy: the book holds parts and chapters, parts hold chapters, chapters hold scenes. A null parent is the book. */
const ALLOWED_CHILDREN: Record<NodeType | "BOOK", NodeType[]> = {
  BOOK: ["PART", "CHAPTER"],
  PART: ["CHAPTER"],
  CHAPTER: ["SCENE"],
  SCENE: [],
};

export function canParent(parentType: NodeType | null, childType: NodeType) {
  return ALLOWED_CHILDREN[parentType ?? "BOOK"].includes(childType);
}

export function defaultNodeTitle(type: NodeType, siblingsOfType: number) {
  const label = type === "PART" ? "Part" : type === "CHAPTER" ? "Chapter" : "Scene";
  return `${label} ${siblingsOfType + 1}`;
}

export const idSchema = z.string().min(1).max(64);
export const nodeTitleSchema = z.string().trim().min(1, "Title is required").max(120, "Title must be 120 characters or fewer");

export const createNodeSchema = z.object({
  projectId: idSchema,
  parentId: idSchema.nullable(),
  type: z.enum(["PART", "CHAPTER", "SCENE"]),
  /** Optional id chosen by the client, so a new row can be shown and renamed before the server answers. */
  id: z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,64}$/)
    .optional(),
});

export const trashNodeSchema = z.object({ projectId: idSchema, nodeId: idSchema });
export const renameNodeSchema = z.object({ projectId: idSchema, nodeId: idSchema, title: nodeTitleSchema });

export const moveNodeSchema = z.object({
  projectId: idSchema,
  nodeId: idSchema,
  parentId: idSchema.nullable(),
  index: z.number().int().min(0),
});

export const saveSceneSchema = z.object({
  projectId: idSchema,
  nodeId: idSchema,
  content: z.record(z.string(), z.unknown()),
});

export const saveSummarySchema = z.object({
  projectId: idSchema,
  nodeId: idSchema,
  summary: z.string().max(2000, "Summary must be 2000 characters or fewer"),
});

export type CreateNodeInput = z.input<typeof createNodeSchema>;
export type MoveNodeInput = z.input<typeof moveNodeSchema>;
