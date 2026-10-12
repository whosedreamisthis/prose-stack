"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckIcon, PlusIcon, Trash2Icon, TriangleAlertIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { createLabel, deleteLabel, recolorLabel, renameLabel } from "@/actions/labels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_LABEL_COLOR,
  DUPLICATE_LABEL,
  LABEL_PRESETS,
  MAX_LABELS,
  MAX_LABEL_NAME_LENGTH,
  isLowContrast,
  labelColorSchema,
  labelNameKey,
  labelNameSchema,
} from "@/lib/label-config";
import { useLabelStore } from "@/lib/stores/label-store";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";
import type { LabelWithUsage } from "@/types/labels";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Used by 4 scenes and 2 plot points", or "Not used yet". */
function usage(label: LabelWithUsage) {
  const parts = [
    label.sceneCount > 0 && plural(label.sceneCount, "scene", "scenes"),
    label.plotPointCount > 0 && plural(label.plotPointCount, "plot point", "plot points"),
  ].filter(Boolean);
  return parts.length ? `Used by ${parts.join(" and ")}` : "Not used yet";
}

/** Checks a name against the rules and the project's other labels. Returns the error, or null when it is fine. */
function nameError(name: string, labels: LabelWithUsage[], exceptId?: string) {
  const parsed = labelNameSchema.safeParse(name);
  if (!parsed.success) return parsed.error.issues[0]?.message ?? "Invalid name.";
  const key = labelNameKey(parsed.data);
  return labels.some((l) => l.id !== exceptId && labelNameKey(l.name) === key) ? DUPLICATE_LABEL : null;
}

/** Preset swatches, a custom color input and a warning when the color is too close to the page background. */
function ColorPicker({ color, onChange, onClose }: { color: string; onChange: (color: string) => void; onClose?: () => void }) {
  const valid = labelColorSchema.safeParse(color).success;
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-2"
      onKeyDown={(e) => {
        // Escape closes just the picker, not the whole modal.
        if (e.key === "Escape" && onClose) {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div role="group" aria-label="Preset colors" className="flex flex-wrap gap-1.5">
        {LABEL_PRESETS.map((preset) => (
          <button
            key={preset.color}
            type="button"
            aria-label={preset.name}
            aria-pressed={color.toLowerCase() === preset.color}
            title={preset.name}
            onClick={() => {
              onChange(preset.color);
              // A preset is a whole choice, so the picker is done; the custom input stays open while the color is being tuned.
              onClose?.();
            }}
            className={cn(
              "grid size-6 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring",
              color.toLowerCase() === preset.color && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
            )}
            style={{ backgroundColor: preset.color }}
          >
            {color.toLowerCase() === preset.color && <CheckIcon className="size-3.5 text-white" aria-hidden />}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Custom
        <input
          type="color"
          value={valid ? color : DEFAULT_LABEL_COLOR}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Custom color"
          className="h-7 w-10 cursor-pointer rounded border bg-transparent p-0.5"
        />
        <span className="font-mono text-xs">{color}</span>
      </label>
      {valid && isLowContrast(color) && (
        <p role="status" className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          This color is close to the background in the light or dark theme, so it may be hard to see.
        </p>
      )}
      {onClose && (
        <Button type="button" size="sm" variant="outline" onClick={onClose} className="self-end">
          Done
        </Button>
      )}
    </div>
  );
}

/** One label: its swatch (opens the color picker), its name (click to rename), its usage and a delete button. */
function LabelRow({
  label,
  labels,
  onRename,
  onRecolor,
  onDelete,
}: {
  label: LabelWithUsage;
  labels: LabelWithUsage[];
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const [picking, setPicking] = useState(false);
  const error = editing ? nameError(name, labels, label.id) : null;
  const rowRef = useRef<HTMLLIElement>(null);

  // A click anywhere outside this label closes its picker.
  useEffect(() => {
    if (!picking) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) setPicking(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [picking]);

  const finish = (commit: boolean) => {
    setEditing(false);
    const trimmed = name.trim();
    if (commit && trimmed !== label.name && !nameError(name, labels, label.id)) onRename(trimmed);
    else setName(label.name);
  };

  return (
    <li ref={rowRef} className="flex flex-col gap-2 py-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Change color of ${label.name}`}
          aria-expanded={picking}
          onClick={() => setPicking((p) => !p)}
          className="size-6 shrink-0 rounded-full outline-none ring-1 ring-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
          style={{ backgroundColor: label.color }}
        />
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input
              autoFocus
              aria-label={`Name of ${label.name}`}
              aria-invalid={!!error}
              value={name}
              maxLength={MAX_LABEL_NAME_LENGTH}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => finish(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") finish(true);
                else if (e.key === "Escape") finish(false);
                else return;
                // The modal must not also treat Escape as "close".
                e.preventDefault();
                e.stopPropagation();
              }}
              className="h-7"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setName(label.name);
                setEditing(true);
              }}
              aria-label={`Rename ${label.name}`}
              className="block max-w-full truncate rounded px-1 text-left text-sm font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              {label.name}
            </button>
          )}
          <p className="px-1 text-xs text-muted-foreground">{usage(label)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={`Delete ${label.name}`} onClick={onDelete}>
          <Trash2Icon />
        </Button>
      </div>
      {error && (
        <p role="alert" className="pl-8 text-xs text-destructive">
          {error}
        </p>
      )}
      {picking && (
        <div className="pl-8">
          <ColorPicker color={label.color} onChange={onRecolor} onClose={() => setPicking(false)} />
        </div>
      )}
    </li>
  );
}

/** The inline "New label" row: a name, a color, and a check button (or Enter) to add it. */
function NewLabelRow({ labels, onAdd, onCancel }: { labels: LabelWithUsage[]; onAdd: (name: string, color: string) => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_LABEL_COLOR);
  const [touched, setTouched] = useState(false);
  const error = nameError(name, labels);
  const colorOk = labelColorSchema.safeParse(color).success;

  /** Set once the row ends on purpose (added, or cancelled), so closing the tab afterwards does not add it again. */
  const done = useRef(false);
  const latest = useRef({ name, color, error, colorOk, onAdd });
  useEffect(() => {
    latest.current = { name, color, error, colorOk, onAdd };
  });

  const submit = () => {
    setTouched(true);
    if (!error && colorOk) {
      done.current = true;
      onAdd(name.trim(), color);
    }
  };

  const cancel = () => {
    done.current = true;
    onCancel();
  };

  // A name typed but not confirmed is still a label the writer meant to add: leaving the tab, or closing the modal with
  // Done, adds it instead of dropping it. Cancel (the X or Escape) is the way to throw it away.
  useEffect(
    () => () => {
      const { name, color, error, colorOk, onAdd } = latest.current;
      if (!done.current && name.trim() && !error && colorOk) onAdd(name.trim(), color);
    },
    [],
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2">
      <div className="flex items-center gap-2">
        <span className="size-6 shrink-0 rounded-full ring-1 ring-foreground/20" style={{ backgroundColor: colorOk ? color : "transparent" }} aria-hidden />
        <Input
          autoFocus
          aria-label="New label name"
          aria-invalid={touched && !!error}
          placeholder="Label name"
          value={name}
          maxLength={MAX_LABEL_NAME_LENGTH}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "Escape") cancel();
            else return;
            e.preventDefault();
            e.stopPropagation();
          }}
          className="h-7"
        />
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Add label" onClick={submit}>
          <CheckIcon />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Cancel" onClick={cancel}>
          <XIcon />
        </Button>
      </div>
      {touched && error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <ColorPicker color={color} onChange={setColor} />
    </div>
  );
}

/**
 * The Labels tab: the project's labels, each editable in place. Unlike the other tabs, every change saves at once (the
 * footer's Save and Cancel do not touch it), and a refusal puts the label back with an error toast.
 */
export function LabelsTab() {
  const projectId = useSettingsStore((s) => s.projectId);
  const labels = useLabelStore((s) => s.labels);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<LabelWithUsage | null>(null);
  const [, startTransition] = useTransition();
  if (!projectId) return null;

  const sorted = (list: LabelWithUsage[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  /** Applies a change to the shared labels now, sends it, and puts the labels back if the server refuses. */
  const commit = (next: LabelWithUsage[], send: () => Promise<{ success: boolean; error?: string }>) => {
    const before = useLabelStore.getState().labels;
    useSettingsStore.getState().markLabelsChanged();
    useLabelStore.getState().setLabels(sorted(next));
    startTransition(async () => {
      const result = await send();
      if (!result.success) {
        useLabelStore.getState().setLabels(before);
        toast.error(result.error ?? "Could not save the label.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Labels save as you change them. Save and Cancel below do not affect them. Put a label on a scene, chapter or part from its menu in the
        outline, and on a plot point in its dialog.
      </p>

      {labels.length === 0 && !adding && <p className="text-sm text-muted-foreground">No labels yet.</p>}
      <ul className="flex flex-col divide-y">
        {labels.map((label) => (
          <LabelRow
            key={label.id}
            label={label}
            labels={labels}
            onRename={(name) =>
              commit(
                labels.map((l) => (l.id === label.id ? { ...l, name } : l)),
                () => renameLabel({ projectId, labelId: label.id, name }),
              )
            }
            onRecolor={(color) =>
              commit(
                labels.map((l) => (l.id === label.id ? { ...l, color } : l)),
                () => recolorLabel({ projectId, labelId: label.id, color }),
              )
            }
            onDelete={() => setDeleting(label)}
          />
        ))}
      </ul>

      {adding ? (
        <NewLabelRow
          labels={labels}
          onCancel={() => setAdding(false)}
          onAdd={(name, color) => {
            const id = crypto.randomUUID();
            setAdding(false);
            commit(
              [...labels, { id, name, color, sceneCount: 0, plotPointCount: 0 }],
              () => createLabel({ projectId, id, name, color }),
            );
          }}
        />
      ) : (
        <Button type="button" variant="outline" disabled={labels.length >= MAX_LABELS} onClick={() => setAdding(true)} className="self-start">
          <PlusIcon /> {labels.length >= MAX_LABELS ? `Label limit reached (${MAX_LABELS})` : "New label"}
        </Button>
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete the label “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && (deleting.sceneCount > 0 || deleting.plotPointCount > 0)
                ? `${usage(deleting)}. They will be unlabeled, not deleted.`
                : "No scene or plot point uses it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleting) {
                  const target = deleting;
                  commit(
                    labels.filter((l) => l.id !== target.id),
                    () => deleteLabel({ projectId, labelId: target.id }),
                  );
                }
                setDeleting(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
