"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FontStyle } from "@/lib/book/blocks";
import type { BookItem } from "@/lib/book/content";
import {
  PAGE,
  paginate,
  type BookMeta,
  type BookPage,
  type Measure,
} from "@/lib/book/paginate";
import { LINE_SPACING_OPTIONS, type Formatting } from "@/lib/project-config";

interface BookViewProps {
  meta: BookMeta;
  items: BookItem[];
  formatting: Formatting;
  /** The CSS font-family value of the project's font. */
  fontCss: string;
  /** The page to open on, from the URL. */
  initialPage: number;
}

/** Width at which two pages sit side by side. */
const SPREAD_MIN_WIDTH = 760;
const STYLES: FontStyle[] = [
  {},
  { bold: true },
  { italic: true },
  { bold: true, italic: true },
];

function fontString(style: FontStyle, size: number, family: string) {
  return `${style.italic ? "italic " : ""}${style.bold ? "bold " : ""}${size}px ${family}`;
}

/** A measurer backed by the browser's canvas, in the project's own font. Sizes are points, so 1 canvas px is 1 pt here. */
function canvasMeasure(family: string): Measure {
  const ctx = document.createElement("canvas").getContext("2d")!;
  const cache = new Map<string, number>();
  return (text, style, size) => {
    const key = `${style.bold ? "b" : ""}${style.italic ? "i" : ""}|${size}|${text}`;
    let width = cache.get(key);
    if (width === undefined) {
      ctx.font = fontString(style, size, family);
      width = ctx.measureText(text).width;
      cache.set(key, width);
    }
    return width;
  };
}

/** The family the browser will really use, with `var(--font-x)` resolved. */
function resolveFamily(css: string) {
  const probe = document.createElement("span");
  probe.style.fontFamily = css;
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family;
}

function PageFace({
  page,
  formatting,
  fontCss,
  scale,
}: {
  page: BookPage | null;
  formatting: Formatting;
  fontCss: string;
  scale: number;
}) {
  const spacing =
    LINE_SPACING_OPTIONS.find((o) => o.value === formatting.lineSpacing) ??
    LINE_SPACING_OPTIONS[2];
  const leading = formatting.fontSize * spacing.leading;
  return (
    <div
      style={{ width: PAGE.width * scale, height: PAGE.height * scale }}
      className="shrink-0"
    >
      <div
        aria-hidden={!page}
        style={{
          width: PAGE.width,
          height: PAGE.height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          fontFamily: fontCss,
          fontSize: formatting.fontSize,
        }}
        className={`relative overflow-hidden bg-white text-black shadow-md ring-1 ring-black/10 dark:bg-neutral-900 dark:text-neutral-100 dark:ring-white/10 ${page ? "" : "invisible"}`}
      >
        {page && (
          <>
            {page.header && (
              <div
                style={{ top: 24, fontSize: 9 }}
                className="absolute inset-x-0 text-center tracking-wide text-black/50 uppercase dark:text-white/50"
              >
                {page.header}
              </div>
            )}
            {page.lines.map((line, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: PAGE.margin + line.y,
                  left: PAGE.margin + line.indent,
                  right: PAGE.margin,
                  height: leading,
                  lineHeight: `${leading}px`,
                  fontSize: line.size,
                  textAlign: line.align,
                  whiteSpace: "pre",
                }}
              >
                {line.runs.map((run, j) => (
                  <span
                    key={j}
                    style={{
                      fontWeight: run.bold ? 700 : undefined,
                      fontStyle: run.italic ? "italic" : undefined,
                    }}
                  >
                    {run.text}
                  </span>
                ))}
              </div>
            ))}
            {page.folio !== null && (
              <div
                style={{ bottom: 24, fontSize: 10 }}
                className="absolute inset-x-0 text-center text-black/60 dark:text-white/60"
              >
                {page.folio}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** The book as a reader sees it: fixed-size pages, a two-page spread on wide screens, and a page at a time on narrow ones. */
export function BookView({
  meta,
  items,
  formatting,
  fontCss,
  initialPage,
}: BookViewProps) {
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [page, setPage] = useState(initialPage);
  const [box, setBox] = useState({ width: 0 });
  /** Which way the last page turn went, so the new pages slide in from that side. Null until the first turn. */
  const [turn, setTurn] = useState<"next" | "prev" | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const turnRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const { fontSize } = formatting;

  // Pages are laid out with the real font, so wait for it to load before measuring.
  useEffect(() => {
    let cancelled = false;
    const family = resolveFamily(fontCss);
    void Promise.all(
      STYLES.map((s) =>
        document.fonts.load(fontString(s, fontSize, family), "Aa"),
      ),
    ).then(() => {
      if (!cancelled) setMeasure(() => canvasMeasure(family));
    });
    return () => {
      cancelled = true;
    };
  }, [fontCss, fontSize]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setBox({ width: el.clientWidth }),
    );
    observer.observe(el);
    setBox({ width: el.clientWidth });
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => (measure ? paginate(meta, items, formatting, measure) : null),
    [measure, meta, items, formatting],
  );
  const total = layout?.pages.length ?? 1;
  const wide = box.width >= SPREAD_MIN_WIDTH;
  const current = Math.min(Math.max(1, page), total);
  // In a spread the title page sits alone on the right; after it, even pages are on the left.
  const left = wide ? (current % 2 === 0 ? current : current - 1) : current;
  const shown = wide ? [left, left + 1] : [current];
  const step = wide ? 2 : 1;
  const lastLeft = wide ? (total % 2 === 0 ? total : total - 1) : total;

  const go = useCallback(
    (to: number) => {
      const next = Math.min(Math.max(1, to), total);
      setTurn(next > page ? "next" : "prev");
      setPage(next);
      const url = new URL(window.location.href);
      url.searchParams.set("page", String(next));
      window.history.replaceState(null, "", url);
    },
    [total, page],
  );

  // A horizontal swipe (or drag) turns the page: left for the next one, right for the previous.
  function onPointerUp(e: React.PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? left + step : left - step);
  }

  // The new pages slide in from the side the turn is heading toward, unless the system asks for less motion.
  useEffect(() => {
    const el = turnRef.current;
    if (
      !turn ||
      !el ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const from = turn === "next" ? "2rem" : "-2rem";
    el.animate(
      [
        { opacity: 0, transform: `translateX(${from})` },
        { opacity: 1, transform: "translateX(0)" },
      ],
      { duration: 250, easing: "ease-out" },
    );
  }, [left, turn]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))
      )
        return;
      if (e.key === "ArrowRight") go(left + step);
      else if (e.key === "ArrowLeft") go(left - step);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, left, step]);

  const scale = box.width
    ? Math.min(
        1.5,
        (box.width - 16) / (wide ? PAGE.width * 2 + 8 : PAGE.width),
        (typeof window === "undefined" ? 900 : window.innerHeight * 0.72) /
          PAGE.height,
      )
    : 0.5;
  const hasChapters = (layout?.contents.length ?? 0) > 0;
  const label = shown.filter((n) => n >= 1 && n <= total).join("–");

  return (
    <div ref={areaRef} className="flex w-full flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous page"
          disabled={left - step < (wide ? 0 : 1)}
          onClick={() => go(left - step)}
        >
          <ChevronLeftIcon />
        </Button>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Page
          <input
            type="number"
            min={1}
            max={total}
            value={current}
            onChange={(e) => e.target.value && go(Number(e.target.value))}
            aria-label="Go to page"
            className="h-8 w-16 rounded-md border bg-background px-2 text-center text-foreground"
          />
          of {total}
        </label>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next page"
          disabled={left >= lastLeft}
          onClick={() => go(left + step)}
        >
          <ChevronRightIcon />
        </Button>
        {hasChapters && (
          <select
            aria-label="Go to chapter"
            value=""
            onChange={(e) => e.target.value && go(Number(e.target.value))}
            className="h-8 max-w-48 rounded-md border bg-background px-2 text-sm"
          >
            <option value="">Go to…</option>
            {layout?.contents.map((c) => (
              <option key={`${c.kind}-${c.page}`} value={c.page}>
                {c.title}
              </option>
            ))}
          </select>
        )}
      </div>
      <div
        role="group"
        aria-label={`Page ${label}`}
        ref={turnRef}
        className="flex touch-pan-y justify-center gap-2 select-none"
        aria-live="polite"
        onPointerDown={(e) =>
          (swipeStart.current = { x: e.clientX, y: e.clientY })
        }
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipeStart.current = null)}
      >
        {layout ? (
          shown.map((n) => (
            <PageFace
              key={n}
              page={layout.pages[n - 1] ?? null}
              formatting={formatting}
              fontCss={fontCss}
              scale={scale}
            />
          ))
        ) : (
          <div
            style={{ width: PAGE.width * scale, height: PAGE.height * scale }}
            className="animate-pulse rounded bg-muted"
          />
        )}
      </div>
      {layout && !hasChapters && (
        <p className="text-sm text-muted-foreground">
          No chapters yet. Add a chapter from the Manuscript menu.
        </p>
      )}
    </div>
  );
}
