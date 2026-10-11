"use client";

import { computeFooterStats } from "@/lib/manuscript-stats";
import { useEditorStore, type SaveStatus } from "@/lib/stores/editor-store";
import type { WordStats } from "@/types/manuscript";

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Couldn't save — retrying",
};

interface EditorStatsProps {
  stats: WordStats;
  /** Words the server has for the open scene; the live count is measured against it. */
  savedSceneWords: number;
}

/** The footer: project words, pages, words today and the save status. Counts follow typing ahead of the save. */
export function EditorStats({ stats, savedSceneWords }: EditorStatsProps) {
  const liveWords = useEditorStore((s) => s.liveWords);
  const saveStatus = useEditorStore((s) => s.saveStatus);
  const { totalWords, pages, wordsToday } = computeFooterStats(stats, savedSceneWords, liveWords);
  const nf = new Intl.NumberFormat("en-US");

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <p>
        {nf.format(totalWords)} words · {nf.format(pages)} {pages === 1 ? "page" : "pages"} · {nf.format(wordsToday)} today
      </p>
      <p aria-live="polite" className={saveStatus === "error" ? "text-destructive" : undefined}>
        {STATUS_TEXT[saveStatus]}
      </p>
    </div>
  );
}
