"use client";

import { useMemo, useTransition } from "react";
import { toast } from "sonner";
import { addScene, createPlotLine, createPlotPoint, renamePlotLine, reorderPlotLines, trashPlotLine, trashPlotPoint, updatePlotPoint } from "@/actions/plot";
import { CELL_TAKEN, DEFAULT_PLOT_LINE_NAME, MAX_PLOT_LINES } from "@/lib/plot-config";
import { usePlotStore } from "@/lib/stores/plot-store";
import type { ActionResult } from "@/types/actions";
import type { PlotPointItem } from "@/types/plot";

const store = () => usePlotStore.getState();

/** The cell a point would occupy, as taken by a point other than `exceptId`. */
export const cellTaken = (points: PlotPointItem[], plotLineId: string, sceneId: string, exceptId?: string) =>
  points.some((p) => p.plotLineId === plotLineId && p.sceneId === sceneId && p.id !== exceptId);

export interface PointValues {
  title: string;
  text: string;
  plotLineId: string;
  sceneId: string;
}

/**
 * Every change to the plot, applied to the shared store first and then sent to the server. A refusal puts the store back
 * as it was and shows the reason. Used by the grid, the Plots section of the left sidebar and the scene sidebar.
 */
export function usePlotActions(projectId: string) {
  const [, startTransition] = useTransition();

  return useMemo(() => {
    /** Runs `send` after the optimistic change; on failure runs `rollback` and shows the error. */
    const commit = (send: () => Promise<ActionResult<unknown>>, rollback: () => void, done?: string) => {
      startTransition(async () => {
        const result = await send();
        if (!result.success) {
          rollback();
          toast.error(result.error);
          return;
        }
        if (done) toast.success(done);
      });
    };

    const keepLines = () => {
      const lines = store().lines;
      return () => store().setLines(lines);
    };
    const keepPoints = () => {
      const points = store().points;
      return () => store().setPoints(points);
    };

    /** Saves `orderedIds` as the new order of the lines, in one request. */
    const reorderLines = (orderedIds: string[]) => {
      const rollback = keepLines();
      const byId = new Map(store().lines.map((l) => [l.id, l]));
      store().setLines(orderedIds.flatMap((id) => byId.get(id) ?? []));
      commit(() => reorderPlotLines({ projectId, orderedIds }), rollback);
    };

    return {
      addLine(): string | null {
        const { lines } = store();
        if (lines.length >= MAX_PLOT_LINES) {
          toast.error(`A project can have up to ${MAX_PLOT_LINES} plot lines.`);
          return null;
        }
        const id = crypto.randomUUID();
        const rollback = keepLines();
        store().setLines([...lines, { id, name: `${DEFAULT_PLOT_LINE_NAME} ${lines.length + 1}` }]);
        commit(() => createPlotLine({ projectId, id }), rollback);
        return id;
      },

      renameLine(plotLineId: string, name: string) {
        const rollback = keepLines();
        store().setLines(store().lines.map((l) => (l.id === plotLineId ? { ...l, name } : l)));
        commit(() => renamePlotLine({ projectId, plotLineId, name }), rollback);
      },

      reorderLines,

      /** Moves a line one place earlier (-1) or later (1); nothing at either end. */
      moveLine(plotLineId: string, by: -1 | 1) {
        const ids = store().lines.map((l) => l.id);
        const from = ids.indexOf(plotLineId);
        const to = from + by;
        if (from < 0 || to < 0 || to >= ids.length) return;
        [ids[from], ids[to]] = [ids[to], ids[from]];
        reorderLines(ids);
      },

      trashLine(plotLineId: string) {
        const rollback = keepLines();
        store().setLines(store().lines.filter((l) => l.id !== plotLineId));
        commit(() => trashPlotLine({ projectId, plotLineId }), rollback, "Moved to the trash.");
      },

      /** Adds a point to a scene, or to a new scene at the end of the manuscript when `sceneId` is null. Returns the ids it was added under. */
      createPoint(values: Omit<PointValues, "sceneId"> & { sceneId: string | null }): { id: string; sceneId: string } | null {
        const { plotLineId, title, text } = values;
        const id = crypto.randomUUID();
        const newSceneId = values.sceneId ? undefined : crypto.randomUUID();
        const sceneId = values.sceneId ?? newSceneId!;
        if (cellTaken(store().points, plotLineId, sceneId)) {
          toast.error(CELL_TAKEN);
          return null;
        }
        const rollback = keepPoints();
        store().setPoints([...store().points, { id, plotLineId, sceneId, title, text }]);
        if (newSceneId) store().addScene({ id: newSceneId, title: "New scene" });
        commit(
          () => createPlotPoint({ projectId, plotLineId, id, title, text, ...(newSceneId ? { newSceneId } : { sceneId }) }),
          () => {
            rollback();
            if (newSceneId) store().removeScene(newSceneId);
          },
        );
        return { id, sceneId };
      },

      /** Saves a point's text, and moves it when its line or scene changed. */
      updatePoint(pointId: string, values: PointValues) {
        const current = store().points.find((p) => p.id === pointId);
        if (!current) return;
        if (cellTaken(store().points, values.plotLineId, values.sceneId, pointId)) {
          toast.error(CELL_TAKEN);
          return;
        }
        const rollback = keepPoints();
        store().setPoints(store().points.map((p) => (p.id === pointId ? { ...p, ...values } : p)));
        commit(
          () =>
            updatePlotPoint({
              projectId,
              pointId,
              title: values.title,
              text: values.text,
              plotLineId: values.plotLineId,
              sceneId: values.sceneId,
            }),
          rollback,
        );
      },

      trashPoint(pointId: string) {
        const rollback = keepPoints();
        store().setPoints(store().points.filter((p) => p.id !== pointId));
        commit(() => trashPlotPoint({ projectId, pointId }), rollback, "Moved to the trash.");
      },

      /** The empty grid's "Add scene": a scene at the end of the manuscript. */
      addScene() {
        const id = crypto.randomUUID();
        store().addScene({ id, title: "New scene" });
        commit(
          () => addScene({ projectId, id }),
          () => store().removeScene(id),
        );
      },
    };
  }, [projectId]);
}
