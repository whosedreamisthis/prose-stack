"use client";

import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cellTaken, usePlotActions } from "@/hooks/usePlotActions";
import { MAX_NOTE_TITLE_LENGTH } from "@/lib/note-config";
import { MAX_PLOT_TEXT_LENGTH, PLOT_POINT_EMPTY } from "@/lib/plot-config";
import type { PlotLineItem, PlotPointItem, PlotScene } from "@/types/plot";

/** The scene choice that adds a scene at the end of the manuscript together with the point. */
const NEW_SCENE = "__new__";

interface DialogValues {
  title: string;
  text: string;
  plotLineId: string;
  sceneId: string;
}

/** Which point the dialog shows: one that exists, or a new one that is only created when it is closed with something in it. */
interface Open {
  key: string;
  pointId: string | null;
  initial: DialogValues;
  /** Offer "New scene" among the scenes: set when adding from the grid's empty row. */
  allowNewScene: boolean;
}

const SELECT =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

interface EditorInput {
  projectId: string;
  lines: PlotLineItem[];
  points: PlotPointItem[];
  /** Every scene a point can be moved to, in manuscript order. */
  scenes: PlotScene[];
}

/**
 * The plot point dialog, as notes have theirs: a card opens it, and closing it (X, Esc, a click outside) saves, so nothing
 * is lost. A new point is only created once it has a title or text. Returns the openers and the dialog to render.
 */
export function usePlotPointEditor({ projectId, lines, points, scenes }: EditorInput): {
  openPoint: (pointId: string) => void;
  openNew: (target: { plotLineId: string; sceneId: string | null }) => void;
  dialog: ReactNode;
} {
  const actions = usePlotActions(projectId);
  const [open, setOpen] = useState<Open | null>(null);

  const openPoint = (pointId: string) => {
    const p = points.find((x) => x.id === pointId);
    if (p) setOpen({ key: p.id, pointId: p.id, initial: { title: p.title, text: p.text, plotLineId: p.plotLineId, sceneId: p.sceneId }, allowNewScene: false });
  };

  const openNew = ({ plotLineId, sceneId }: { plotLineId: string; sceneId: string | null }) =>
    setOpen({
      key: crypto.randomUUID(),
      pointId: null,
      initial: { title: "", text: "", plotLineId, sceneId: sceneId ?? NEW_SCENE },
      allowNewScene: sceneId === null,
    });

  const save = (target: Open, raw: DialogValues) => {
    const values = { ...raw, title: raw.title.trim(), text: raw.text.trim() };
    if (!target.pointId) {
      if (!values.title && !values.text) return;
      actions.createPoint({
        plotLineId: values.plotLineId,
        sceneId: values.sceneId === NEW_SCENE ? null : values.sceneId,
        title: values.title,
        text: values.text,
      });
      return;
    }
    const before = target.initial;
    if (
      values.title === before.title &&
      values.text === before.text &&
      values.plotLineId === before.plotLineId &&
      values.sceneId === before.sceneId
    ) {
      return;
    }
    if (!values.title && !values.text) {
      toast.error(`${PLOT_POINT_EMPTY}. Use Move to trash to remove it.`);
      return;
    }
    actions.updatePoint(target.pointId, values);
  };

  const dialog = open && (
    <PlotPointDialog
      key={open.key}
      open={open}
      lines={lines}
      points={points}
      scenes={scenes}
      onClose={(values) => {
        save(open, values);
        setOpen(null);
      }}
    />
  );

  return { openPoint, openNew, dialog };
}

interface PlotPointDialogProps {
  open: Open;
  lines: PlotLineItem[];
  points: PlotPointItem[];
  scenes: PlotScene[];
  onClose: (values: DialogValues) => void;
}

function PlotPointDialog({ open, lines, points, scenes, onClose }: PlotPointDialogProps) {
  const [values, setValues] = useState(open.initial);
  const isNew = open.pointId === null;
  const taken = (plotLineId: string, sceneId: string) => sceneId !== NEW_SCENE && cellTaken(points, plotLineId, sceneId, open.pointId ?? undefined);

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) onClose(values);
      }}
    >
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 overflow-y-auto sm:max-w-lg">
        <DialogTitle className="sr-only">{isNew ? "New plot point" : "Plot point"}</DialogTitle>
        <DialogDescription className="sr-only">Changes are saved when you close this plot point.</DialogDescription>
        <Input
          aria-label="Plot point title"
          placeholder="Title"
          value={values.title}
          maxLength={MAX_NOTE_TITLE_LENGTH}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          className="mr-8 h-9 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <Textarea
          autoFocus
          aria-label="Plot point text"
          placeholder="What happens"
          value={values.text}
          maxLength={MAX_PLOT_TEXT_LENGTH}
          onChange={(e) => setValues((v) => ({ ...v, text: e.target.value }))}
          className="min-h-32 resize-none border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Plot line</span>
            <select
              className={SELECT}
              value={values.plotLineId}
              onChange={(e) => setValues((v) => ({ ...v, plotLineId: e.target.value }))}
            >
              {lines.map((line) => (
                <option key={line.id} value={line.id} disabled={line.id !== values.plotLineId && taken(line.id, values.sceneId)}>
                  {line.name}
                  {taken(line.id, values.sceneId) && line.id !== values.plotLineId ? " (taken)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">Scene</span>
            <select
              className={SELECT}
              value={values.sceneId}
              onChange={(e) => setValues((v) => ({ ...v, sceneId: e.target.value }))}
            >
              {open.allowNewScene && <option value={NEW_SCENE}>New scene (added to the end)</option>}
              {scenes.map((scene) => (
                <option key={scene.id} value={scene.id} disabled={scene.id !== values.sceneId && taken(values.plotLineId, scene.id)}>
                  {scene.title}
                  {taken(values.plotLineId, scene.id) && scene.id !== values.sceneId ? " (taken)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}
