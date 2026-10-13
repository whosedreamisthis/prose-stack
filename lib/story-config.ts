import { z } from "zod";
import { STORY_TEMPLATE_IDS } from "@/lib/story-templates";

/** The template of a project: a built-in id, or null for none. */
export const storyTemplateIdSchema = z.enum(STORY_TEMPLATE_IDS, { error: "Pick one of the listed story structures" }).nullable();

export const beatKeySchema = z.string().trim().min(1).max(64);

const idSchema = z.string().min(1).max(64);

export const toggleBeatSchema = z.object({ projectId: idSchema, beatKey: beatKeySchema, covered: z.boolean() }).strict();
export const beatSceneSchema = z.object({ projectId: idSchema, beatKey: beatKeySchema, sceneId: idSchema }).strict();

export const BEAT_NOT_FOUND = "That stage is not part of this project's story structure.";

/** The message shown before a switch that drops progress. */
export function discardWarning(count: number) {
  return count === 1
    ? "1 stage of the current structure is not in the new one. Its covered mark and scene links will be removed."
    : `${count} stages of the current structure are not in the new one. Their covered marks and scene links will be removed.`;
}
