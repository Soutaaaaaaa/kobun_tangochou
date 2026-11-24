import { daysSince, type ProgressMap, type WordProgress } from "./progress";

/**
 * 出やすさの重み（画面には出さない）。1.0 が標準。
 * - 間違えた割合が高いほど少し重く（ベイズ平均：正解・不正解に1ずつ足して極端な値を抑える）
 * - 最後に学習してから日が経つほど少し重く（30日で頭打ち）
 * 最も軽い語と最も重い語で、出やすさの差はおよそ2倍。
 */
export function difficultyWeight(p: WordProgress | undefined, now = Date.now()): number {
  if (!p) return 1;
  const rate = (p.wrong_count + 1) / (p.correct_count + p.wrong_count + 2); // 0〜1、未回答は0.5
  const ratePart = 0.75 + 0.5 * rate; // 0.75〜1.25
  const d = daysSince(p.last_studied_at, now);
  const stalePart = d === null ? 1 : 1 + 0.3 * (Math.min(d, 30) / 30); // 1.0〜1.3
  return ratePart * stalePart;
}

/** 重み付きシャッフル（重い語ほど前に来やすい）。Efraimidis–Spirakis 法 */
export function weightedShuffle<T>(items: readonly T[], weight: (x: T) => number): T[] {
  return items
    .map((x) => ({ x, k: Math.pow(Math.random(), 1 / Math.max(weight(x), 1e-6)) }))
    .sort((a, b) => b.k - a.k)
    .map((e) => e.x);
}

export const weightedByProgress = <T extends { n: number }>(items: readonly T[], progress: ProgressMap, now = Date.now()) =>
  weightedShuffle(items, (w) => difficultyWeight(progress.get(w.n), now));
