/** word_progress テーブルの1行 */
export type WordProgress = {
  word_no: number;
  is_weak: boolean;
  last_result: boolean | null;
  correct_count: number;
  wrong_count: number;
  streak: number;
  first_studied_at: string | null;
  last_studied_at: string | null;
  last_correct_at: string | null;
  last_wrong_at: string | null;
};

export type ProgressMap = Map<number, WordProgress>;
export type StudyMode = "card" | "quiz" | "review";

/** 覚えた＝直近が正解で、苦手リストに入っていない */
export const isKnown = (p?: WordProgress) => !!p && p.last_result === true && !p.is_weak;
export const isWeak = (p?: WordProgress) => !!p && p.is_weak;

const DAY = 24 * 60 * 60 * 1000;
export const daysSince = (iso: string | null | undefined, now = Date.now()) =>
  iso ? Math.max(0, (now - new Date(iso).getTime()) / DAY) : null;

/** 「今日」「昨日」「3日前」「2週間前」 */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const then = new Date(iso);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d0 = new Date(then);
  d0.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - d0.getTime()) / DAY);
  if (days <= 0) return "今日";
  if (days === 1) return "昨日";
  if (days < 14) return `${days}日前`;
  if (days < 60) return `${Math.floor(days / 7)}週間前`;
  return `${then.getMonth() + 1}/${then.getDate()}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
