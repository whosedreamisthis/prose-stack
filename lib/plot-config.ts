import { z } from "zod";
import { MAX_NOTE_TITLE_LENGTH } from "@/lib/note-config";

const idSchema = z.string().min(1).max(64);
const clientIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{8,64}$/)
  .optional();

export const DEFAULT_PLOT_LINE_NAME = "Plot line";
export const MAX_PLOT_LINES = 20;
export const MAX_PLOT_TEXT_LENGTH = 2000;
export const PLOT_POINT_EMPTY = "A plot point needs a title or some text";
export const CELL_TAKEN = "That scene already has a plot point on that plot line.";

export const plotLineNameSchema = z.string().trim().min(1, "Name is required").max(60, "Name must be 60 characters or fewer");
const titleSchema = z.string().trim().max(MAX_NOTE_TITLE_LENGTH, `Titles must be ${MAX_NOTE_TITLE_LENGTH} characters or fewer`);
const textSchema = z.string().trim().max(MAX_PLOT_TEXT_LENGTH, `Text must be ${MAX_PLOT_TEXT_LENGTH} characters or fewer`);

/** A plot point needs a title or some text; with neither it is just an empty card. Checked after trimming. */
export const hasPlotText = (point: { title?: string; text?: string }) => !!(point.title || point.text);

export const createPlotLineSchema = z.object({ projectId: idSchema, id: clientIdSchema });
export const plotLineRefSchema = z.object({ projectId: idSchema, plotLineId: idSchema });
export const renamePlotLineSchema = z.object({ projectId: idSchema, plotLineId: idSchema, name: plotLineNameSchema });
export const reorderPlotLinesSchema = z.object({ projectId: idSchema, orderedIds: z.array(idSchema).min(1).max(MAX_PLOT_LINES) });

/** Either an existing scene, or `newSceneId`: a scene added at the end of the manuscript together with the point. */
export const createPlotPointSchema = z
  .object({
    projectId: idSchema,
    plotLineId: idSchema,
    sceneId: idSchema.optional(),
    newSceneId: clientIdSchema,
    id: clientIdSchema,
    title: titleSchema.optional(),
    text: textSchema,
  })
  .refine((v) => !(v.sceneId && v.newSceneId), "Pick one scene.")
  .refine(hasPlotText, PLOT_POINT_EMPTY);

/** Changes to a point; `plotLineId` and `sceneId` move it to another cell. */
export const updatePlotPointSchema = z
  .object({
    projectId: idSchema,
    pointId: idSchema,
    title: titleSchema.optional(),
    text: textSchema.optional(),
    plotLineId: idSchema.optional(),
    sceneId: idSchema.optional(),
  })
  .refine((v) => !(v.title === "" && v.text === ""), PLOT_POINT_EMPTY);
export const plotPointRefSchema = z.object({ projectId: idSchema, pointId: idSchema });

export type CreatePlotPointInput = z.input<typeof createPlotPointSchema>;
export type UpdatePlotPointInput = z.input<typeof updatePlotPointSchema>;
