"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { useEditorState, type Editor } from "@tiptap/react";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { addProofreadIgnore } from "@/actions/proofread";
import { Button } from "@/components/ui/button";
import { PROOFREAD_CATEGORIES, type ProofreadCategory } from "@/lib/proofread/config";
import { cancelProofread, clearProofread, showSuggestion, startProofread } from "@/lib/proofread/session";
import { proofreadRanges } from "@/lib/proofread-extension";
import { useProofreadStore, type ProofreadItem } from "@/lib/stores/proofread-store";
import { cn } from "@/lib/utils";

/** The category switches, used in the panel and in Settings. They decide which suggestions are shown and underlined. */
export function ProofreadCategories({ editor, compact = false }: { editor?: Editor | null; compact?: boolean }) {
  const categories = useProofreadStore((s) => s.categories);
  const setCategories = useProofreadStore((s) => s.setCategories);

  useEffect(() => {
    void useProofreadStore.persist.rehydrate();
  }, []);

  const toggle = (id: ProofreadCategory) => {
    const next = categories.includes(id) ? categories.filter((c) => c !== id) : [...categories, id];
    setCategories(next);
    if (editor && !editor.isDestroyed) editor.commands.setProofreadHidden(PROOFREAD_CATEGORIES.map((c) => c.id).filter((c) => !next.includes(c)));
  };

  return (
    <fieldset className={cn("flex gap-x-4 gap-y-1.5", compact ? "flex-wrap" : "flex-col")}>
      <legend className="sr-only">Categories to show</legend>
      {PROOFREAD_CATEGORIES.map((c) => (
        <label key={c.id} className="flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" checked={categories.includes(c.id)} onChange={() => toggle(c.id)} className="mt-1 accent-primary" />
          <span>
            {c.label}
            {!compact && <span className="block text-xs text-muted-foreground">{c.hint}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function SuggestionCard({
  item,
  range,
  onShow,
  onAccept,
  onDismiss,
  onIgnore,
}: {
  item: ProofreadItem;
  range: { valid: boolean } | undefined;
  onShow: () => void;
  onAccept: () => void;
  onDismiss: () => void;
  onIgnore: () => void;
}) {
  const active = useProofreadStore((s) => s.active === item.id);
  const current = !!range?.valid;
  const ignoreLabel = item.ignore.kind === "WORD" ? `Ignore “${item.ignore.value}” always` : "Ignore this rule always";
  return (
    <li className={cn("rounded-lg border bg-card p-3", active && "border-primary", !current && "opacity-60")}>
      <button type="button" onClick={onShow} disabled={!current} className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default">
        <span className="block text-xs font-medium text-primary">{item.message}</span>
        <span className="mt-1 block text-muted-foreground">
          {item.before.length > 0 && "…"}
          {item.before}
          <mark className="rounded bg-primary/15 px-0.5 text-foreground">{item.text}</mark>
          {item.after}
          {item.after.length > 0 && "…"}
        </span>
      </button>
      {current && item.replacement !== null && (
        <p className="mt-1.5 text-xs">
          {item.replacement === "" ? (
            <>Remove it.</>
          ) : (
            <>
              Change to <strong className="font-medium">{item.replacement}</strong>
            </>
          )}
        </p>
      )}
      {!current && <p className="mt-1.5 text-xs text-muted-foreground">Out of date: the text has changed.</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {current && item.replacement !== null && (
          <Button size="sm" onClick={onAccept}>
            <CheckIcon aria-hidden /> Accept
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onDismiss}>
          <XIcon aria-hidden /> Dismiss
        </Button>
        <Button size="sm" variant="ghost" onClick={onIgnore} disabled={!current}>
          {ignoreLabel}
        </Button>
      </div>
    </li>
  );
}

/**
 * The Proofread panel above the scene, like Find and replace: it shows the progress of a check and then lists what it
 * found, for the writer to accept or dismiss one by one. Escape or the close button ends the review.
 */
export function ProofreadPanel({ editor, projectId, scrollTo }: { editor: Editor; projectId: string; scrollTo: "top" | "panel" }) {
  const { status, progress, scope, items, error, changedDuringRun, skipped, categories } = useProofreadStore();
  const removeItems = useProofreadStore((s) => s.removeItems);
  const panelRef = useRef<HTMLElement>(null);

  // Starting a run brings the panel into view, wherever the writer was. A single scene scrolls to its top, where the
  // panel is; on a chapter, part or book page the panel sits above one scene in the middle, so it scrolls to the panel.
  useEffect(() => {
    if (status !== "running") return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (scrollTo === "panel") {
      panelRef.current?.scrollIntoView({ block: "start", behavior: calm ? "auto" : "smooth" });
      return;
    }
    let scroller: HTMLElement | null = panelRef.current?.parentElement ?? null;
    while (scroller && !(scroller.scrollHeight > scroller.clientHeight && /auto|scroll/.test(getComputedStyle(scroller).overflowY))) {
      scroller = scroller.parentElement;
    }
    scroller?.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  }, [status, scrollTo]);

  // Where each suggestion is right now, kept current by the editor as the writer types.
  const ranges =
    useEditorState({
      editor,
      selector: ({ editor }) => {
        const out: Record<string, { from: number; to: number; valid: boolean }> = {};
        if (editor) for (const [id, r] of proofreadRanges(editor.state)) out[id] = { from: r.from, to: r.to, valid: r.valid };
        return out;
      },
    }) ?? {};

  const shown = items.filter((i) => categories.includes(i.category));
  const outOfDate = items.some((i) => !ranges[i.id]?.valid);
  const run = () => void startProofread(editor, projectId);
  const close = () => {
    clearProofread(editor);
    editor.commands.focus();
  };

  function drop(ids: string[]) {
    editor.commands.removeProofreadMarks(ids);
    removeItems(ids);
  }

  function accept(item: ProofreadItem) {
    const range = proofreadRanges(editor.state).get(item.id);
    if (!range?.valid || item.replacement === null) return;
    const { tr } = editor.state;
    editor.view.dispatch(item.replacement === "" ? tr.delete(range.from, range.to) : tr.insertText(item.replacement, range.from, range.to));
    drop([item.id]);
  }

  async function ignore(item: ProofreadItem) {
    const result = await addProofreadIgnore({ projectId, ...item.ignore });
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    drop(items.filter((i) => i.ignore.kind === item.ignore.kind && i.ignore.value === item.ignore.value).map((i) => i.id));
  }

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Escape") return;
    e.preventDefault();
    close();
  }

  return (
    <section
      ref={panelRef}
      aria-label="Proofread"
      onKeyDown={onKeyDown}
      className="mx-auto mb-3 flex w-full max-w-2xl flex-col gap-3 rounded-lg border bg-popover p-3 text-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <ProofreadCategories editor={editor} compact />
        <Button type="button" variant="ghost" size="icon" aria-label="Close proofreading" onClick={close}>
          <XIcon className="size-4" aria-hidden />
        </Button>
      </div>

      {status === "running" && (
        <div className="flex flex-col gap-2" role="status" aria-live="polite">
          <p className="flex items-center gap-2">
            <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Checking… {progress.done} of {progress.total}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full bg-primary transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <Button variant="outline" size="sm" onClick={cancelProofread} className="self-start">
            Cancel
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-2" role="alert">
          <p className="text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Your scene was not changed.</p>
          <Button variant="outline" size="sm" onClick={run} className="self-start">
            Try again
          </Button>
        </div>
      )}

      {status === "done" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground" role="status">
              {shown.length === 0 ? "No suggestions" : `${shown.length} suggestion${shown.length === 1 ? "" : "s"}`}
              {scope === "selection" ? " in the selection" : ""}
            </p>
            <Button variant="outline" size="sm" onClick={run}>
              Run again
            </Button>
          </div>
          {(outOfDate || changedDuringRun) && (
            <p className="rounded-md bg-muted px-2 py-1.5 text-xs text-muted-foreground">
              The scene has changed since it was checked. Run again for fresh suggestions.
            </p>
          )}
          {skipped > 0 && (
            <p className="text-xs text-muted-foreground">
              {skipped} very long paragraph{skipped === 1 ? " was" : "s were"} left out.
            </p>
          )}
          {shown.length > 0 && (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {shown.map((item) => (
                <SuggestionCard
                  key={item.id}
                  item={item}
                  range={ranges[item.id]}
                  onShow={() => showSuggestion(editor, item.id)}
                  onAccept={() => accept(item)}
                  onDismiss={() => drop([item.id])}
                  onIgnore={() => void ignore(item)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
