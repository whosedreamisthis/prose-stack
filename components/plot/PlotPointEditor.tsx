"use client";

import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { DialogSaveBar } from "@/components/layout/DialogSaveBar";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDialogAutosave } from "@/hooks/useDialogAutosave";
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

const emptyValues: DialogValues = { title: "", text: "", plotLineId: "", sceneId: "" };

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
 * The plot point dialog, as notes have theirs: a card opens it and it saves as you type, so closing it (Done, the X, Esc, a
 * click outside) only closes. A new point is only created once it has a title or text. Returns the openers and the dialog to render.
 */
export function usePlotPointEditor({ projectId, lines, points, scenes }: EditorInput): {
  openPoint: (pointId: string) => void;
  openNew: (target: { plotLineId: string; sceneId: string | null }) => void;
  dialog: ReactNode;
} {
  const actions = usePlotActions(projectId);
  const [open, setOpen] = useState<Open | null>(null);
  /** What the server has for the open dialog, so each autosave sends only what changed and a point is created once. */
  const saved = useRef<{ id: string | null; values: DialogValues; newSceneId: string | null }>({ id: null, values: emptyValues, newSceneId: null });

  const openPoint = (pointId: string) => {
    const p = points.find((x) => x.id === pointId);
    if (!p) return;
    const initial = { title: p.title, text: p.text, plotLineId: p.plotLineId, sceneId: p.sceneId };
    saved.current = { id: p.id, values: initial, newSceneId: null };
    setOpen({ key: p.id, pointId: p.id, initial, allowNewScene: false });
  };

  const openNew = ({ plotLineId, sceneId }: { plotLineId: string; sceneId: string | null }) => {
    const initial = { title: "", text: "", plotLineId, sceneId: sceneId ?? NEW_SCENE };
    saved.current = { id: null, values: initial, newSceneId: null };
    setOpen({ key: crypto.randomUUID(), pointId: null, initial, allowNewScene: sceneId === null });
  };

  /** Saves what the dialog shows. `quiet` is for autosaves: a point emptied mid-edit is skipped without a complaint. */
  const save = (raw: DialogValues, quiet = false) => {
    const was = saved.current;
    const values = { ...raw, title: raw.title.trim(), text: raw.text.trim() };
    const blank = !values.title && !values.text;
    // A scene added together with the point has its real id once the point exists.
    const sceneId = values.sceneId === NEW_SCENE ? was.newSceneId : values.sceneId;
    if (!was.id) {
      if (blank) return;
      const created = actions.createPoint({ plotLineId: values.plotLineId, sceneId, title: values.title, text: values.text });
      if (created) saved.current = { id: created.id, values, newSceneId: values.sceneId === NEW_SCENE ? created.sceneId : null };
      return;
    }
    const b = was.values;
    if (values.title === b.title && values.text === b.text && values.plotLineId === b.plotLineId && values.sceneId === b.sceneId) return;
    if (blank) {
      if (!quiet) toast.error(`${PLOT_POINT_EMPTY}. Use Move to trash to remove it.`);
      return;
    }
    if (!sceneId) return;
    actions.updatePoint(was.id, { ...values, sceneId });
    saved.current = { ...was, values };
  };

  const dialog = open && (
    <PlotPointDialog
      key={open.key}
      open={open}
      lines={lines}
      points={points}
      scenes={scenes}
      onAutosave={(values) => save(values, true)}
      onClose={(values) => {
        save(values);
        setOpen(null);
      }}
    />
  );

  return { openPoint, openNew, dialog };
}

interface PlotPointDialogProps {
  open: Open;
  onAutosave: (values: DialogValues) => void;
  lines: PlotLineItem[];
  points: PlotPointItem[];
  scenes: PlotScene[];
  onClose: (values: DialogValues) => void;
}

function PlotPointDialog({ open, lines, points, scenes, onAutosave, onClose }: PlotPointDialogProps) {
  const [values, setValues] = useState(open.initial);
  const { dirty } = useDialogAutosave(values, onAutosave);
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
        <DialogDescription className="sr-only">Changes are saved as you type.</DialogDescription>
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
        <DialogSaveBar dirty={dirty} empty={!values.title.trim() && !values.text.trim()} onDone={() => onClose(values)} />
      </DialogContent>
    </Dialog>
  );
}
