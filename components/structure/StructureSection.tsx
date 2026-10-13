"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { linkBeatScene, toggleBeatCovered, unlinkBeatScene } from "@/actions/story";
import { getStoryTemplate, type StoryBeat } from "@/lib/story-templates";
import { useSettingsStore } from "@/lib/stores/settings-store";
import { cn } from "@/lib/utils";
import type { BeatState, StructureData } from "@/types/story";

export interface StructureScene {
  id: string;
  title: string;
}

type Change =
  | { kind: "covered"; beatKey: string; covered: boolean }
  | { kind: "link"; beatKey: string; scene: StructureScene }
  | { kind: "unlink"; beatKey: string; sceneId: string };

const EMPTY_BEAT: BeatState = { covered: false, scenes: [] };

function applyChange(progress: StructureData["progress"], change: Change): StructureData["progress"] {
  const current = progress[change.beatKey] ?? EMPTY_BEAT;
  if (change.kind === "covered") return { ...progress, [change.beatKey]: { ...current, covered: change.covered } };
  if (change.kind === "link") {
    if (current.scenes.some((s) => s.id === change.scene.id)) return progress;
    return { ...progress, [change.beatKey]: { ...current, scenes: [...current.scenes, change.scene] } };
  }
  return { ...progress, [change.beatKey]: { ...current, scenes: current.scenes.filter((s) => s.id !== change.sceneId) } };
}

interface BeatRowProps {
  projectId: string;
  beat: StoryBeat;
  state: BeatState;
  scenes: StructureScene[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (change: Change) => void;
}

function BeatRow({ projectId, beat, state, scenes, open, onOpenChange, onChange }: BeatRowProps) {
  const bodyId = useId();
  const linked = new Set(state.scenes.map((s) => s.id));
  const unlinked = scenes.filter((s) => !linked.has(s.id));

  return (
    <li className="flex flex-col">
      <div className="flex items-start gap-1.5 rounded-md px-1.5 py-1 hover:bg-accent/60">
        {/* Native checkboxes can't be rounded, so the box and its check are drawn from state; the real input sits invisibly on top. */}
        <span
          className={cn(
            "relative mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
            state.covered ? "border-primary bg-primary text-primary-foreground" : "border-input bg-transparent dark:bg-input/30",
          )}
        >
          <input
            type="checkbox"
            checked={state.covered}
            aria-label={`${beat.title}: covered`}
            onChange={(e) => onChange({ kind: "covered", beatKey: beat.key, covered: e.target.checked })}
            className="absolute inset-0 m-0 cursor-pointer appearance-none opacity-0"
          />
          {state.covered && <CheckIcon className="pointer-events-none size-3.5 stroke-3" aria-hidden />}
        </span>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => onOpenChange(!open)}
          className="flex min-w-0 flex-1 items-start gap-1 rounded text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className={cn("min-w-0 flex-1 break-words", state.covered && "text-muted-foreground line-through decoration-1")}>{beat.title}</span>
          {state.scenes.length > 0 && (
            <span className="mt-0.5 shrink-0 rounded-full bg-muted px-1.5 text-xs text-muted-foreground" aria-label={`${state.scenes.length} linked scenes`}>
              {state.scenes.length}
            </span>
          )}
          {open ? <ChevronDownIcon className="mt-0.5 size-4 shrink-0" aria-hidden /> : <ChevronRightIcon className="mt-0.5 size-4 shrink-0" aria-hidden />}
        </button>
      </div>
      <div id={bodyId} hidden={!open} className="ml-7 flex flex-col gap-2 pb-2 pr-1 text-sm">
        <p className="text-muted-foreground">{beat.description}</p>
        {beat.prompts.length > 0 && (
          <ul className="list-disc pl-4 text-muted-foreground">
            {beat.prompts.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-foreground/80">Linked scenes</span>
          {state.scenes.length === 0 ? (
            <span className="text-xs text-muted-foreground">No scenes linked.</span>
          ) : (
            <ul className="flex flex-wrap gap-1">
              {state.scenes.map((scene) => (
                <li key={scene.id} className="flex max-w-full items-center rounded-full border bg-background text-xs">
                  <Link
                    href={`/projects/${projectId}/manuscript?scene=${scene.id}`}
                    className="min-w-0 truncate rounded-l-full py-0.5 pl-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {scene.title}
                  </Link>
                  <button
                    type="button"
                    aria-label={`Unlink ${scene.title}`}
                    onClick={() => onChange({ kind: "unlink", beatKey: beat.key, sceneId: scene.id })}
                    className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <XIcon className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {unlinked.length > 0 && (
            <select
              aria-label={`Link a scene to ${beat.title}`}
              value=""
              onChange={(e) => {
                const scene = scenes.find((s) => s.id === e.target.value);
                if (scene) onChange({ kind: "link", beatKey: beat.key, scene });
              }}
              className="h-8 min-w-0 rounded-lg border border-input bg-background px-2 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="">Link a scene…</option>
              {unlinked.map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
    </li>
  );
}

interface StructureSectionProps {
  projectId: string;
  structure: StructureData;
  /** The project's live scenes in outline order, for linking. */
  scenes: StructureScene[];
}

/** The body of the Structure sidebar section: the project's story structure as a checklist of stages. */
export function StructureSection({ projectId, structure, scenes }: StructureSectionProps) {
  const requestOpen = useSettingsStore((s) => s.requestOpen);
  const [progress, applyOptimistic] = useOptimistic(structure.progress, applyChange);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const template = getStoryTemplate(structure.templateId);

  if (!template) {
    return (
      <div className="flex flex-col items-start gap-2 px-2 py-1 text-sm text-muted-foreground">
        <p>A story structure is a guide to the shape of your plot. It never adds chapters or scenes.</p>
        <button
          type="button"
          onClick={requestOpen}
          className="rounded text-primary underline underline-offset-2 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          Choose a story structure
        </button>
      </div>
    );
  }

  function change(next: Change) {
    startTransition(async () => {
      applyOptimistic(next);
      const input = { projectId, beatKey: next.beatKey };
      const result =
        next.kind === "covered"
          ? await toggleBeatCovered({ ...input, covered: next.covered })
          : next.kind === "link"
            ? await linkBeatScene({ ...input, sceneId: next.scene.id })
            : await unlinkBeatScene({ ...input, sceneId: next.sceneId });
      if (!result.success) toast.error(result.error);
    });
  }

  const covered = template.beats.filter((b) => progress[b.key]?.covered).length;

  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 text-xs text-muted-foreground">
        {template.name} · {covered} of {template.beats.length} covered
      </p>
      <ul className="flex flex-col">
        {template.beats.map((beat) => (
          <BeatRow
            key={beat.key}
            projectId={projectId}
            beat={beat}
            state={progress[beat.key] ?? EMPTY_BEAT}
            scenes={scenes}
            open={openKey === beat.key}
            onOpenChange={(open) => setOpenKey(open ? beat.key : null)}
            onChange={change}
          />
        ))}
      </ul>
    </div>
  );
}
