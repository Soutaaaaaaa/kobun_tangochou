import { daysSince, type ProgressMap } from "./progress";
import { difficultyWeight, weightedShuffle } from "./weight";
import { WORDS400, shuffle, type Word } from "./words";

export type ReviewItem = { word: Word; reason: string; kind: "priority" | "normal" };

export const REVIEW_SIZE = 40;
/** 40問のうち優先枠の割合（残りは普通の単語を織り込む） */
const PRIORITY_RATIO = 0.7;

/**
 * 今日の復習を組み立てる。
 * 優先度: 数日前（1〜7日前、とくに3日前前後）に間違えた語 > 苦手リストの語 > しばらく学習していない語。
 * 今日すでに正解した語は後回し。優先枠のあとに、ランダムな「普通の単語」を混ぜてシャッフルする。
 */
export function buildTodayReview(
  progress: ProgressMap,
  size = REVIEW_SIZE,
  now = Date.now(),
  /** 出題する単語（単語帳ごと。関連語を含めるかもここで決める） */
  pool: Word[] = WORDS400,
): ReviewItem[] {
  const scored: { word: Word; score: number; reason: string }[] = [];

  for (const w of pool) {
    const p = progress.get(w.n);
    if (!p || !p.last_studied_at) continue; // 未学習の語は「普通の単語」枠で出す
    const dStudy = daysSince(p.last_studied_at, now)!;
    const dWrong = daysSince(p.last_wrong_at, now);
    let s = 0;
    const reasons: [number, string][] = [];

    if (dWrong !== null) {
      if (dWrong >= 1 && dWrong <= 7) {
        const v = 40 - Math.abs(dWrong - 3) * 4;
        s += v;
        reasons.push([v, `${Math.floor(dWrong)}日前に間違えた`]);
      } else if (dWrong < 1) {
        s += 12;
        reasons.push([12, "今日間違えた"]);
      } else {
        s += 15;
        reasons.push([15, `${Math.floor(dWrong)}日前に間違えた`]);
      }
    }
    if (p.is_weak) {
      s += 30;
      reasons.push([30, "苦手リスト"]);
    }
    const stale = Math.min(dStudy, 30) * 1.2;
    s += stale;
    if (dStudy >= 4) reasons.push([stale, `${Math.floor(dStudy)}日間学習していない`]);
    s += Math.max(0, p.wrong_count - p.correct_count) * 4;
    // 表示しない傾斜：間違えた割合が高い・しばらく学習していない語を少しだけ上げる
    s += (difficultyWeight(p, now) - 1) * 20;
    if (p.last_result && dStudy < 1) s -= 25;
    s += Math.random() * 6;

    if (s >= 20 && reasons.length) {
      reasons.sort((a, b) => b[0] - a[0]);
      scored.push({ word: w, score: s, reason: reasons[0][1] });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const priority = scored.slice(0, Math.round(size * PRIORITY_RATIO));
  const chosen = new Set(priority.map((x) => x.word.n));

  const normal = weightedShuffle(
    pool.filter((w) => !chosen.has(w.n)),
    (w) => difficultyWeight(progress.get(w.n), now),
  )
    .slice(0, size - priority.length)
    .map<ReviewItem>((w) => ({ word: w, reason: progress.get(w.n)?.last_studied_at ? "ランダム" : "はじめての単語", kind: "normal" }));

  return shuffle([...priority.map<ReviewItem>((x) => ({ word: x.word, reason: x.reason, kind: "priority" })), ...normal]);
}
