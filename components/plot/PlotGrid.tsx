"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeftIcon, ArrowRightIcon, GripVerticalIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { renameNode, trashNode } from "@/actions/manuscript";
import { ConfirmTrashDialog } from "@/components/layout/ConfirmTrashDialog";
import { RenameItem, RowMenu, TrashItem } from "@/components/manuscript/RowMenu";
import { TitleEditor } from "@/components/manuscript/TitleEditor";
import { PlotLineView } from "@/components/plot/PlotLineView";
import { usePlotPointEditor } from "@/components/plot/PlotPointEditor";
import { RenamePlotLineDialog } from "@/components/plot/RenamePlotLineDialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cellTaken, usePlotActions } from "@/hooks/usePlotActions";
import { LabelChip } from "@/components/labels/LabelChip";
import { LabelFilter } from "@/components/labels/LabelFilter";
import { useLabelData } from "@/hooks/useLabelData";
import { usePlotData } from "@/hooks/usePlotData";
import { nodeTitleSchema } from "@/lib/manuscript-config";
import { CELL_TAKEN, MAX_PLOT_LINES } from "@/lib/plot-config";
import { usePlotStore } from "@/lib/stores/plot-store";
import { cn } from "@/lib/utils";
import type { LabelItem, LabelWithUsage } from "@/types/labels";
import type { PlotData, PlotLineItem, PlotPointItem, PlotScene } from "@/types/plot";

const lineDragId = (id: string) => `line:${id}`;
const pointDragId = (id: string) => `point:${id}`;
const cellDropId = (plotLineId: string, sceneId: string) => `cell:${plotLineId}:${sceneId}`;

/** Lines are sorted among the headers, a point is dropped on a cell: each drag only considers its own kind of target. */
const collision: CollisionDetection = (args) => {
  const want = args.active.data.current?.type === "line" ? "line" : "cell";
  const droppableContainers = args.droppableContainers.filter((c) => c.data.current?.type === want);
  return want === "line" ? closestCenter({ ...args, droppableContainers }) : pointerWithin({ ...args, droppableContainers });
};

const CELL_WIDTH = "w-56 min-w-56 max-w-56";

interface PlotGridProps {
  projectId: string;
  plot: PlotData;
  labels: LabelWithUsage[];
  /** The project's scenes in manuscript order. */
  scenes: PlotScene[];
}

type Dragging = { type: "point"; point: PlotPointItem } | { type: "line"; line: PlotLineItem };

/**
 * The plot lines grid: scenes down the left in manuscript order, plot lines across, and a plot point is the cell where a
 * scene's row meets a plot line. Points are dragged between cells and lines are dragged by the grip in their header (or
 * moved from its menu); the last row adds a point together with a new scene.
 */
export function PlotGrid({ projectId, plot, labels: serverLabels, scenes }: PlotGridProps) {
  const { lines, points } = usePlotData(plot);
  const labels = useLabelData(serverLabels);
  const labelById = (id: string | null) => labels.find((l) => l.id === id) ?? null;
  const addedScenes = usePlotStore((s) => s.addedScenes);
  const actions = usePlotActions(projectId);
  const focusLineId = useSearchParams().get("line");
  /** The label the grid is filtered by: other labels' cards fade. */
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Dragging | null>(null);
  const [renaming, setRenaming] = useState<PlotLineItem | null>(null);
  const [trashingLine, setTrashingLine] = useState<PlotLineItem | null>(null);
  const [trashingScene, setTrashingScene] = useState<PlotScene | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  /** Scene names just typed, shown until the outline arrives with them (or put back if the server refuses). */
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [, startTransition] = useTransition();
  const router = useRouter();

  // A scene added here is shown at once; once the outline has it, the outline's row takes over.
  useEffect(() => {
    for (const scene of usePlotStore.getState().addedScenes) if (scenes.some((s) => s.id === scene.id)) usePlotStore.getState().removeScene(scene.id);
  }, [scenes]);
  const rows = [...scenes, ...addedScenes.filter((a) => !scenes.some((s) => s.id === a.id))].map((s) => ({ ...s, title: titles[s.id] ?? s.title }));

  const editor = usePlotPointEditor({ projectId, lines, points, scenes: rows, labels });

  // Mouse and touch drag the cards (a card's own click and keyboard stay a click); the keyboard sensor is only for the header grips.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current;
    if (data?.type === "point") {
      const point = points.find((p) => p.id === data.pointId);
      if (point) setDragging({ type: "point", point });
    } else if (data?.type === "line") {
      const line = lines.find((l) => l.id === data.plotLineId);
      if (line) setDragging({ type: "line", line });
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragging(null);
    const data = active.data.current;
    const target = over?.data.current;
    if (!data || !target) return;
    if (data.type === "line" && target.type === "line" && data.plotLineId !== target.plotLineId) {
      const ids = lines.map((l) => l.id);
      actions.reorderLines(arrayMove(ids, ids.indexOf(data.plotLineId), ids.indexOf(target.plotLineId)));
    } else if (data.type === "point" && target.type === "cell") {
      const point = points.find((p) => p.id === data.pointId);
      if (!point || (point.plotLineId === target.plotLineId && point.sceneId === target.sceneId)) return;
      if (cellTaken(points, target.plotLineId, target.sceneId, point.id)) {
        toast.error(CELL_TAKEN);
        return;
      }
      actions.updatePoint(point.id, {
        title: point.title,
        text: point.text,
        labelId: point.labelId,
        plotLineId: target.plotLineId,
        sceneId: target.sceneId,
      });
    }
  };

  /** Ends an inline scene rename: a changed, valid title is saved; Escape, a blank or an unchanged title just closes the input. */
  const finishSceneRename = (scene: PlotScene, value: string | null) => {
    setEditingSceneId(null);
    const title = nodeTitleSchema.safeParse(value ?? "");
    if (!title.success || title.data === scene.title) return;
    setTitles((t) => ({ ...t, [scene.id]: title.data }));
    startTransition(async () => {
      const result = await renameNode({ projectId, nodeId: scene.id, title: title.data });
      if (!result.success) toast.error(result.error);
      // Either way the outline now has the real title (or the old one back), so the typed one is dropped.
      setTitles((t) => Object.fromEntries(Object.entries(t).filter(([id]) => id !== scene.id)));
    });
  };

  const trashScene = (scene: PlotScene) =>
    startTransition(async () => {
      const result = await trashNode({ projectId, nodeId: scene.id });
      if (!result.success) toast.error(result.error);
      else toast.success("Moved to the trash.");
    });

  // `?line=` shows that one plot line on its own, not the grid.
  const openLine = lines.find((l) => l.id === focusLineId);
  if (openLine) {
    return (
      <>
        <PlotLineView projectId={projectId} line={openLine} points={points} labelById={labelById} scenes={rows} onOpen={editor.openPoint} onTrash={actions.trashPoint} />
        {editor.dialog}
      </>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 pt-16 text-center">
        <h1 className="text-xl font-semibold">No scenes yet</h1>
        <p className="text-sm text-muted-foreground">The plot grid plans your scenes. Add a scene to start, then add plot lines across.</p>
        <button
          type="button"
          onClick={() => actions.addScene()}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground outline-none hover:bg-primary/90 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <PlusIcon className="size-4" aria-hidden /> Add scene
        </button>
      </div>
    );
  }

  return (
    <>
      <DndContext id="plot-grid" sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
        <div className="h-full overflow-auto">
          <LabelFilter labels={labels} value={filterLabelId} onChange={setFilterLabelId} className="mx-4 mt-4 w-48" />
          <table className="mx-4 my-2 border-separate border-spacing-0 text-sm">
            <caption className="sr-only">Plot grid: scenes down the side, plot lines across</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 left-0 z-30 w-44 min-w-44 border-b bg-background p-2 text-left font-medium text-muted-foreground">
                  Scenes
                </th>
                <SortableContext items={lines.map((l) => lineDragId(l.id))} strategy={horizontalListSortingStrategy}>
                  {lines.map((line, index) => (
                    <LineHeader
                      key={line.id}
                      line={line}
                      first={index === 0}
                      last={index === lines.length - 1}
                      onRename={() => setRenaming(line)}
                      onMove={(by) => actions.moveLine(line.id, by)}
                      onTrash={() => setTrashingLine(line)}
                    />
                  ))}
                </SortableContext>
                <th scope="col" className={cn("sticky top-0 z-20 border-b bg-background p-2 text-left", CELL_WIDTH)}>
                  <button
                    type="button"
                    disabled={lines.length >= MAX_PLOT_LINES}
                    onClick={() => actions.addLine()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border px-3 py-2 text-sm font-normal text-muted-foreground outline-none transition-colors hover:border-primary hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                  >
                    Add plot line <PlusIcon className="size-4" aria-hidden />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((scene) => (
                <tr key={scene.id}>
                  <th scope="row" className="group/item sticky left-0 z-10 w-44 min-w-44 border-b bg-background p-2 pr-8 text-left align-top font-medium">
                    {editingSceneId === scene.id ? (
                      <TitleEditor initial={scene.title} label="Rename scene" onDone={(value) => finishSceneRename(scene, value)} />
                    ) : (
                      <Link
                        href={`/projects/${projectId}/manuscript?scene=${scene.id}`}
                        className="block rounded outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="line-clamp-3 wrap-break-word">{scene.title}</span>
                      </Link>
                    )}
                    <RowMenu label={`${scene.title} options`} className="top-2 translate-y-0">
                      <RenameItem onClick={() => setEditingSceneId(scene.id)} />
                      <TrashItem onClick={() => setTrashingScene(scene)} />
                    </RowMenu>
                  </th>
                  {lines.map((line) => {
                    const point = points.find((p) => p.plotLineId === line.id && p.sceneId === scene.id);
                    return (
                      <Cell key={line.id} line={line} scene={scene}>
                        {point ? (
                          <PointCard
                            point={point}
                            label={labelById(point.labelId)}
                            dimmed={(dragging?.type === "point" && dragging.point.id === point.id) || (!!filterLabelId && point.labelId !== filterLabelId)}
                            onOpen={() => editor.openPoint(point.id)}
                            onTrash={() => actions.trashPoint(point.id)}
                          />
                        ) : (
                          <AddPointButton
                            label={`Add a plot point to ${scene.title} on ${line.name}`}
                            onClick={() => editor.openNew({ plotLineId: line.id, sceneId: scene.id })}
                          />
                        )}
                      </Cell>
                    );
                  })}
                  <td className="border-b" />
                </tr>
              ))}
              {lines.length > 0 && (
                <tr>
                  <th scope="row" className="sticky left-0 z-10 w-44 min-w-44 bg-background p-2 text-left align-top font-normal text-muted-foreground">
                    New scene
                  </th>
                  {lines.map((line) => (
                    <td key={line.id} className={cn("p-2 align-top", CELL_WIDTH,)}>
                      <AddPointButton
                        always
                        label={`Add a plot point to a new scene on ${line.name}`}
                        onClick={() => editor.openNew({ plotLineId: line.id, sceneId: null })}
                      />
                    </td>
                  ))}
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <DragOverlay>
          {dragging?.type === "point" && <PointCardBody point={dragging.point} label={labelById(dragging.point.labelId)} className="cursor-grabbing shadow-lg" />}
          {dragging?.type === "line" && (
            <div className={cn("rounded-lg border bg-background p-2 font-medium shadow-lg", CELL_WIDTH)}>{dragging.line.name}</div>
          )}
        </DragOverlay>
      </DndContext>
      {editor.dialog}
      <RenamePlotLineDialog line={renaming} onCancel={() => setRenaming(null)} onSave={(name) => renaming && actions.renameLine(renaming.id, name)} />
      <ConfirmTrashDialog
        target={trashingLine && { kind: "plot line", name: trashingLine.name, detail: "Its plot points are hidden with it and return if you restore it." }}
        onCancel={() => setTrashingLine(null)}
        onConfirm={() => {
          if (trashingLine) {
            actions.trashLine(trashingLine.id);
            if (trashingLine.id === focusLineId) router.replace(`/projects/${projectId}/plot`);
          }
          setTrashingLine(null);
        }}
      />
      <ConfirmTrashDialog
        target={trashingScene && { kind: "scene", name: trashingScene.title, detail: "Its plot points go with it." }}
        onCancel={() => setTrashingScene(null)}
        onConfirm={() => {
          if (trashingScene) trashScene(trashingScene);
          setTrashingScene(null);
        }}
      />
    </>
  );
}

interface LineHeaderProps {
  line: PlotLineItem;
  first: boolean;
  last: boolean;
  onRename: () => void;
  onMove: (by: -1 | 1) => void;
  onTrash: () => void;
}

/** A plot line's column header: a grip to drag it, its name, and a menu to rename, move and trash it. */
function LineHeader({ line, first, last, onRename, onMove, onTrash }: LineHeaderProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: lineDragId(line.id),
    data: { type: "line", plotLineId: line.id },
  });

  return (
    <th
      ref={setNodeRef}
            scope="col"
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "group/item sticky top-0 z-20 border-b bg-background p-2 pr-8 text-left align-middle font-semibold",
        CELL_WIDTH,
        isDragging && "z-40 opacity-50",
      )}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          ref={setActivatorNodeRef}
          aria-label={`Drag to reorder ${line.name}`}
          className="grid size-6 shrink-0 cursor-grab place-items-center rounded text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          {...attributes}
          {...listeners}
        >
          <GripVerticalIcon className="size-4" aria-hidden />
        </button>
        <span className="truncate" onDoubleClick={onRename}>
          {line.name}
        </span>
      </div>
      <RowMenu label={`${line.name} options`}>
        <RenameItem onClick={onRename} />
        <DropdownMenuItem disabled={first} onClick={() => onMove(-1)}>
          <ArrowLeftIcon /> Move left
        </DropdownMenuItem>
        <DropdownMenuItem disabled={last} onClick={() => onMove(1)}>
          <ArrowRightIcon /> Move right
        </DropdownMenuItem>
        <TrashItem onClick={onTrash} />
      </RowMenu>
    </th>
  );
}

/** One cell: where a scene's row meets a plot line. A dragged point can be dropped on it. */
function Cell({ line, scene, children }: { line: PlotLineItem; scene: PlotScene; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: cellDropId(line.id, scene.id), data: { type: "cell", plotLineId: line.id, sceneId: scene.id } });
  return (
    <td
      ref={setNodeRef}
      className={cn("group/cell border-b p-2 align-top transition-colors", CELL_WIDTH, isOver && "bg-primary/15")}
    >
      {children}
    </td>
  );
}

function PointCardBody({ point, label, className }: { point: PlotPointItem; label: LabelItem | null; className?: string }) {
  return (
    <div className={cn("flex max-h-40 min-h-12 w-full flex-col gap-1 overflow-hidden rounded-lg border bg-card p-2.5 text-left text-sm", className)}>
      {point.title && <span className="truncate font-semibold">{point.title}</span>}
      {point.text && <span className="line-clamp-4 wrap-break-word whitespace-pre-wrap text-foreground/80">{point.text}</span>}
      {label && <LabelChip label={label} className="mt-auto self-start" />}
    </div>
  );
}

/** A plot point as a card: a click opens it, a drag moves it to another cell. */
function PointCard({
  point,
  label,
  dimmed,
  onOpen,
  onTrash,
}: {
  point: PlotPointItem;
  label: LabelItem | null;
  dimmed: boolean;
  onOpen: () => void;
  onTrash: () => void;
}) {
  const { listeners, setNodeRef } = useDraggable({ id: pointDragId(point.id), data: { type: "point", pointId: point.id } });
  const [confirming, setConfirming] = useState(false);
  // Only the pointer handlers: the keyboard keeps a card a plain button, and the dialog moves a point by keyboard.
  const { onMouseDown, onTouchStart } = (listeners ?? {}) as { onMouseDown?: React.MouseEventHandler; onTouchStart?: React.TouchEventHandler };
  const name = point.title || point.text.slice(0, 40);

  return (
    <div className="group/item relative">
      <button
        type="button"
        ref={setNodeRef}
        aria-label={`Plot point: ${name}`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={onOpen}
        className={cn(
          "block w-full cursor-grab rounded-lg pr-0 text-left outline-none transition-opacity focus-visible:ring-3 focus-visible:ring-ring/50 [&>div]:pr-8 [&>div]:hover:border-primary",
          dimmed && "opacity-40",
        )}
      >
        <PointCardBody point={point} label={label} />
      </button>
      <RowMenu label={`${name} options`} className="top-2 translate-y-0">
        <TrashItem onClick={() => setConfirming(true)} />
      </RowMenu>
      <ConfirmTrashDialog
        target={confirming ? { kind: "plot point", name } : null}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          onTrash();
          setConfirming(false);
        }}
      />
    </div>
  );
}

/** The "+" of an empty cell: faint until the cell is hovered or focused, so a grid of them stays quiet. */
function AddPointButton({ label, onClick, always }: { label: string; onClick: () => void; always?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid h-12 w-full place-items-center rounded-lg border-2 border-dashed border-border text-muted-foreground outline-none transition-opacity hover:border-primary hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
        !always && "opacity-0 group-hover/cell:opacity-100",
      )}
    >
      <PlusIcon className="size-4" aria-hidden />
    </button>
  );
}
