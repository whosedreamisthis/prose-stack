"use client";

import { useEffect, useRef, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { SearchIcon, XIcon } from "lucide-react";
import { searchScenes } from "@/actions/search";
import { Input } from "@/components/ui/input";
import { useModKey } from "@/hooks/useModKey";
import {
  MAX_RESULTS,
  MIN_QUERY_LENGTH,
  highlightText,
  textMatches,
  type SceneSearchResult,
  type SearchUnit,
  type SnippetPart,
} from "@/lib/scene-search";
import { useEditorStore } from "@/lib/stores/editor-store";
import { useLayoutStore } from "@/lib/stores/layout-store";
import { useSearchStore } from "@/lib/stores/search-store";
import { cn } from "@/lib/utils";
import type { LabelWithUsage } from "@/types/labels";
import type { ManuscriptNodeSummary } from "@/types/manuscript";

const DEBOUNCE_MS = 250;
const SEARCH_BOX_LABEL = "Search scenes";

/** Whether the search is showing results (and so the outline's rows are replaced by them). */
export function useSearching() {
  return useSearchStore((s) => s.query.trim().length >= MIN_QUERY_LENGTH);
}

function Marked({ parts }: { parts: SnippetPart[] }) {
  return parts.map((p, i) =>
    p.match ? (
      <mark key={i} className="rounded-sm bg-primary/20 text-foreground">
        {p.text}
      </mark>
    ) : (
      <span key={i}>{p.text}</span>
    ),
  );
}

function focusSearchBox() {
  document.querySelector<HTMLInputElement>(`input[aria-label="${SEARCH_BOX_LABEL}"]`)?.focus();
}

function focusResult(from: Element | null, step: 1 | -1) {
  const items = Array.from(document.querySelectorAll<HTMLElement>("[data-search-results] a"));
  const next = items[(from ? items.indexOf(from as HTMLElement) : -1) + step];
  if (next) next.focus();
  else if (step === -1) focusSearchBox();
}

interface SceneSearchProps {
  projectId: string;
  /** Whether the manuscript is the open page, which is where Ctrl+Shift+F works. */
  onManuscriptPage: boolean;
}

/** The search box above the outline. It also runs the search; the matches are shown by `SceneSearchResults`. */
export function SceneSearch({ projectId, onManuscriptPage }: SceneSearchProps) {
  const query = useSearchStore((s) => s.query);
  const data = useSearchStore((s) => s.data);
  const attach = useSearchStore((s) => s.attach);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setResult = useSearchStore((s) => s.setResult);
  const setLoading = useSearchStore((s) => s.setLoading);
  const clear = useSearchStore((s) => s.clear);
  const setDrawerOpen = useLayoutStore((s) => s.setDrawerOpen);
  const editor = useEditorStore((s) => s.editor);
  const findOpen = useEditorStore((s) => s.findOpen);
  const mod = useModKey();
  const inputRef = useRef<HTMLInputElement>(null);
  /** Only the newest request may write its answer, so a slow earlier one cannot overwrite a later one. */
  const requestId = useRef(0);
  const trimmed = query.trim();
  const searching = trimmed.length >= MIN_QUERY_LENGTH;

  useEffect(() => attach(projectId), [attach, projectId]);

  useEffect(() => {
    const id = ++requestId.current;
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setResult({ data: null, error: null });
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const result = await searchScenes({ projectId, query: trimmed }).catch(() => null);
      if (id !== requestId.current) return;
      if (result?.success) setResult({ data: result.data, error: null });
      else setResult({ data: null, error: result?.success === false ? result.error : "Could not search. Please try again." });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [projectId, trimmed, setLoading, setResult]);

  // Mark the first searched word in the open scene, with the editor's own find highlight, until the search is cleared.
  const firstWord = data?.units[0]?.[0]?.text ?? "";
  useEffect(() => {
    if (!editor || editor.isDestroyed || findOpen) return;
    editor.commands.setSearch(searching ? firstWord : "");
  }, [editor, findOpen, searching, firstWord]);

  useEffect(() => {
    if (!onManuscriptPage) return;
    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey || e.key.toLowerCase() !== "f") return;
      e.preventDefault();
      // The mobile drawer holds the box; open it first.
      setDrawerOpen(true);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }),
      );
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onManuscriptPage, setDrawerOpen]);

  function clearSearch() {
    clear();
    inputRef.current?.focus();
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" && query) {
      e.preventDefault();
      clearSearch();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusResult(null, 1);
    }
  }

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        ref={inputRef}
        type="text"
        role="searchbox"
        aria-label={SEARCH_BOX_LABEL}
        placeholder={`Search scenes (${mod}+Shift+F)`}
        value={query}
        maxLength={100}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onInputKeyDown}
        className="h-8 pr-8 pl-8"
      />
      {query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clearSearch}
          className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <XIcon className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** "Part 1 › Chapter 3": the parents above a scene, since the outline's rows are replaced while results show. */
function placeOf(byId: Map<string, ManuscriptNodeSummary>, scene: ManuscriptNodeSummary) {
  const names: string[] = [];
  for (let up = scene.parentId ? byId.get(scene.parentId) : undefined; up; up = up.parentId ? byId.get(up.parentId) : undefined) names.unshift(up.title);
  return names.join(" › ");
}

interface SceneSearchResultsProps {
  /** The outline, for each result's title and where it sits. */
  nodes: ManuscriptNodeSummary[];
  labels: LabelWithUsage[];
  /** The scene open now, shown as the selected result. */
  activeId: string | undefined;
  hrefFor: (sceneId: string) => string;
  onOpenResult: (sceneId: string) => void;
}

/** The matching scenes. They stand in for the outline's rows, under the book's own row, while the search has text. */
export function SceneSearchResults({ nodes, labels, activeId, hrefFor, onOpenResult }: SceneSearchResultsProps) {
  const query = useSearchStore((s) => s.query);
  const data = useSearchStore((s) => s.data);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);
  const clear = useSearchStore((s) => s.clear);
  const trimmed = query.trim();

  const byId = new Map(nodes.map((n) => [n.id, n]));
  // A scene trashed or deleted since the search ran is no longer in the outline.
  const results = (data?.results ?? []).filter((r) => byId.has(r.id));

  function onKeyDown(e: KeyboardEvent<HTMLLIElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusResult(document.activeElement, e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Escape") {
      e.preventDefault();
      clear();
      focusSearchBox();
    }
  }

  return (
    <li role="none" onKeyDown={onKeyDown} className={cn("flex flex-col gap-1.5 transition-opacity", loading && "opacity-60")}>
      <p role="status" className="px-1 text-xs text-muted-foreground">
        {error
          ? error
          : !data
            ? "Searching…"
            : data.total === 0
              ? `No scenes match “${trimmed}”. Try fewer words.`
              : data.total > MAX_RESULTS
                ? `Showing ${MAX_RESULTS} of ${data.total}. Refine your search.`
                : `${data.total} ${data.total === 1 ? "scene" : "scenes"}`}
      </p>
      {data && (
        <ul data-search-results aria-label="Search results" aria-busy={loading} className="flex flex-col gap-0.5">
          {results.map((r) => {
            const node = byId.get(r.id)!;
            return (
              <ResultRow
                key={r.id}
                result={r}
                node={node}
                place={placeOf(byId, node)}
                label={labels.find((l) => l.id === node.labelId) ?? null}
                units={data.units}
                active={r.id === activeId}
                href={hrefFor(r.id)}
                onOpen={() => onOpenResult(r.id)}
              />
            );
          })}
        </ul>
      )}
    </li>
  );
}

function ResultRow({
  result,
  node,
  place,
  label,
  units,
  active,
  href,
  onOpen,
}: {
  result: SceneSearchResult;
  node: ManuscriptNodeSummary;
  place: string;
  label: LabelWithUsage | null;
  units: SearchUnit[];
  active: boolean;
  href: string;
  onOpen: () => void;
}) {
  const snippet: ReactNode = result.snippet.length > 0 && (
    <>
      {result.snippetBefore && "… "}
      <Marked parts={result.snippet} />
      {result.snippetAfter && " …"}
    </>
  );
  return (
    <li>
      <Link
        href={href}
        onClick={onOpen}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex flex-col gap-0.5 rounded-md px-2 py-1.5 text-sm outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          active && "bg-muted",
        )}
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium">
            <Marked parts={highlightText(node.title, units)} />
          </span>
          {label && (
            <span
              className={cn(
                "ml-auto flex shrink-0 items-center gap-1 rounded-full border px-1.5 text-xs",
                textMatches(label.name, units) && "border-primary bg-primary/10",
              )}
            >
              <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
            </span>
          )}
        </span>
        {place && <span className="truncate text-xs text-muted-foreground">{place}</span>}
        {snippet && <span className="line-clamp-3 text-xs text-muted-foreground">{snippet}</span>}
      </Link>
    </li>
  );
}
