/** 日付キー "YYYY-MM-DD"（端末の現地時間） */
export function dayKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export const parseDayKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export type DayStat = { answers: number; wrong: number };
export type DayMap = Map<string, DayStat>;

export type Streak = {
  /** 現在の連続日数（今日まだでも、昨日まで続いていれば数える） */
  current: number;
  /** 最長の連続日数 */
  best: number;
  studiedToday: boolean;
  /** 学習した日の合計 */
  totalDays: number;
};

export function computeStreak(days: DayMap, today = new Date()): Streak {
  const has = (d: Date) => (days.get(dayKey(d))?.answers ?? 0) > 0;
  const studiedToday = has(today);
  let current = 0;
  for (let d = studiedToday ? today : addDays(today, -1); has(d); d = addDays(d, -1)) current++;

  const keys = [...days.entries()].filter(([, v]) => v.answers > 0).map(([k]) => k).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = parseDayKey(k);
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best: Math.max(best, current), studiedToday, totalDays: keys.length };
}

/** 連続日数に応じたほのおの大きさ（px） */
export const flameSize = (streak: number, base = 56, max = 132) => Math.min(max, base + Math.sqrt(streak) * 13);
