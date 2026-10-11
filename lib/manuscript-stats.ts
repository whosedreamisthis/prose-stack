import { WORDS_PER_PAGE } from "@/lib/manuscript-config";
import type { WordStats } from "@/types/manuscript";

export interface FooterStats {
  totalWords: number;
  pages: number;
  wordsToday: number;
}

/**
 * The footer numbers. `liveWords` is the open scene's word count right now and `savedSceneWords` what the server has
 * for it, so the total moves with typing ahead of the save. Words today is 0 before the first save of the day.
 */
export function computeFooterStats(stats: WordStats, savedSceneWords: number, liveWords: number | null): FooterStats {
  const totalWords = Math.max(0, stats.totalWords + (liveWords === null ? 0 : liveWords - savedSceneWords));
  return {
    totalWords,
    pages: Math.ceil(totalWords / WORDS_PER_PAGE),
    wordsToday: stats.startWords === null ? 0 : Math.max(0, totalWords - stats.startWords),
  };
}
