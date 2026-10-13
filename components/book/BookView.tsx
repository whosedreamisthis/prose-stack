"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FontStyle } from "@/lib/book/blocks";
import type { BookItem } from "@/lib/book/content";
import {
  PAGE,
  paginate,
  type BookMeta,
  type BookPage,
  type Measure,
} from "@/lib/book/paginate";
import { useBookNavStore } from "@/lib/stores/book-nav-store";
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

/** The book as a reader sees it: fixed-size pages, one page at a time. */
export function BookView({
  meta,
  items,
  formatting,
  fontCss,
  initialPage,
}: BookViewProps) {
  const [measure, setMeasure] = useState<Measure | null>(null);
  const [page, setPage] = useState(initialPage);
  const [box, setBox] = useState({ width: 0, height: 0 });
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
      setBox({ width: el.clientWidth, height: el.clientHeight }),
    );
    observer.observe(el);
    setBox({ width: el.clientWidth, height: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => (measure ? paginate(meta, items, formatting, measure) : null),
    [measure, meta, items, formatting],
  );
  const total = layout?.pages.length ?? 1;
  const current = Math.min(Math.max(1, page), total);

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
    go(dx < 0 ? current + 1 : current - 1);
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
  }, [current, turn]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable ||
          /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))
      )
        return;
      if (e.key === "ArrowRight") go(current + 1);
      else if (e.key === "ArrowLeft") go(current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, current]);

  // Fit the whole page in the space the book has, so a page never needs scrolling.
  const scale =
    box.width && box.height
      ? Math.min(
          1.5,
          (box.width - 16) / PAGE.width,
          (box.height - 16) / PAGE.height,
        )
      : 0.5;
  const hasChapters = (layout?.contents.length ?? 0) > 0;

  // The page controls live in the project's top bar, so hand them what they need.
  const contents = layout?.contents;
  useEffect(() => {
    useBookNavStore.getState().setNav({ current, total, contents: contents ?? [], go });
  }, [current, total, contents, go]);
  useEffect(() => () => useBookNavStore.getState().setNav(null), []);

  return (
    <div ref={areaRef} className="relative flex h-full w-full flex-col items-center justify-center">
      <div
        role="group"
        aria-label={`Page ${current}`}
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
          <PageFace
            page={layout.pages[current - 1] ?? null}
            formatting={formatting}
            fontCss={fontCss}
            scale={scale}
          />
        ) : (
          <div
            style={{ width: PAGE.width * scale, height: PAGE.height * scale }}
            className="animate-pulse rounded bg-muted"
          />
        )}
      </div>
      {layout && !hasChapters && (
        <p className="absolute inset-x-0 bottom-2 text-center text-sm text-muted-foreground">
          No chapters yet. Add a chapter from the Manuscript menu.
        </p>
      )}
    </div>
  );
}
