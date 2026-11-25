"use client";

import { useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import Flame from "@/components/Flame";
import { useProgress } from "@/components/ProgressProvider";
import { addDays, computeStreak, dayKey, parseDayKey, type DayStat } from "@/lib/streak";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

/** 1日の解答数 → 色の濃さ（0〜4） */
const level = (n: number) => (n <= 0 ? 0 : n < 10 ? 1 : n < 30 ? 2 : n < 60 ? 3 : 4);

export default function CalendarPage() {
  const { days } = useProgress();
  const today = new Date();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(dayKey(today));

  const s = days ? computeStreak(days, today) : null;
  const first = month;
  const lead = first.getDay();
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  // 連続している日（今日から遡る現在の連続）
  const streakDays = new Set<string>();
  if (days && s) {
    for (let d = s.studiedToday ? today : addDays(today, -1), n = 0; n < s.current; n++, d = addDays(d, -1)) streakDays.add(dayKey(d));
  }

  const inMonth = [...(days?.entries() ?? [])].filter(([k, v]) => k.startsWith(dayKey(first).slice(0, 7)) && v.answers > 0);
  const monthAnswers = inMonth.reduce((a, [, v]) => a + v.answers, 0);
  const sel: DayStat | undefined = days?.get(selected);
  const isCurrentMonth = first.getFullYear() === today.getFullYear() && first.getMonth() === today.getMonth();
  const selDate = parseDayKey(selected);

  return (
    <>
      <AppBar title="学習カレンダー" back="/" />
      <Page>
        {!days || !s ? (
          <p className="py-16 text-center text-muted">読み込み中…</p>
        ) : (
          <>
            <section className="panel flex items-center gap-4 p-4">
              <Flame streak={s.current} lit={s.studiedToday} base={72} max={140} />
              <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2">
                <div>
                  <p className="text-[11px] text-muted">いまの連続</p>
                  <p className="font-word text-2xl font-black tabular-nums">
                    {s.current}
                    <small className="ml-0.5 font-body text-xs">日</small>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">最長の連続</p>
                  <p className="font-word text-2xl font-black tabular-nums">
                    {s.best}
                    <small className="ml-0.5 font-body text-xs">日</small>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">学習した日</p>
                  <p className="font-word text-2xl font-black tabular-nums">
                    {s.totalDays}
                    <small className="ml-0.5 font-body text-xs">日</small>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted">今日</p>
                  <p className={`pt-1.5 text-sm font-bold ${s.studiedToday ? "text-take" : "text-shu"}`}>
                    {s.studiedToday ? `${days.get(dayKey(today))?.answers ?? 0}問 学習済み` : "まだ"}
                  </p>
                </div>
              </div>
            </section>

            <section className="panel grid gap-3 p-4">
              <div className="flex items-center justify-between">
                <button
                  className="rounded-md px-2 py-1 text-lg text-ai"
                  onClick={() => setMonth(new Date(first.getFullYear(), first.getMonth() - 1, 1))}
                  aria-label="前の月"
                >
                  ‹
                </button>
                <div className="text-center">
                  <p className="font-bold tabular-nums">
                    {first.getFullYear()}年{first.getMonth() + 1}月
                  </p>
                  <p className="text-[11px] tabular-nums text-muted">
                    学習 {inMonth.length}日・{monthAnswers}問
                  </p>
                </div>
                <button
                  className="rounded-md px-2 py-1 text-lg text-ai disabled:opacity-30"
                  onClick={() => setMonth(new Date(first.getFullYear(), first.getMonth() + 1, 1))}
                  disabled={isCurrentMonth}
                  aria-label="次の月"
                >
                  ›
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted">
                {WD.map((w, i) => (
                  <span key={w} className={i === 0 ? "text-shu" : i === 6 ? "text-ai" : ""}>
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {cells.map((d, i) => {
                  if (!d) return <span key={i} />;
                  const k = dayKey(d);
                  const n = days.get(k)?.answers ?? 0;
                  const lv = level(n);
                  const future = d > today && k !== dayKey(today);
                  const isToday = k === dayKey(today);
                  return (
                    <button
                      key={k}
                      disabled={future}
                      onClick={() => setSelected(k)}
                      aria-label={`${d.getMonth() + 1}月${d.getDate()}日 ${n}問`}
                      aria-pressed={selected === k}
                      className={`relative grid aspect-square place-items-center rounded-lg text-[13px] tabular-nums transition ${
                        future ? "text-line" : lv >= 3 ? "font-bold text-white" : "text-ink"
                      } ${selected === k ? "ring-2 ring-ai" : isToday ? "ring-1 ring-ink" : ""}`}
                      style={{ background: lv ? `var(--heat-${lv})` : "var(--surface-2)" }}
                    >
                      {d.getDate()}
                      {streakDays.has(k) && (
                        <svg viewBox="0 0 100 115" className="absolute right-0.5 top-0.5 h-2.5 w-2.5" aria-hidden>
                          <path
                            d="M50 4C57 22 82 35 84 66c2 27-15 45-34 45S15 94 17 68c1-17 11-25 15-38 4 10 9 13 13 13C43 29 45 16 50 4Z"
                            fill="var(--flame-1)"
                          />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-1 text-[10px] text-muted">
                少ない
                {[0, 1, 2, 3, 4].map((l) => (
                  <span key={l} className="h-3 w-3 rounded-[3px]" style={{ background: l ? `var(--heat-${l})` : "var(--surface-2)" }} />
                ))}
                多い
              </div>
            </section>

            <section className="panel flex items-baseline justify-between gap-3 p-4">
              <p className="font-bold tabular-nums">
                {selDate.getMonth() + 1}月{selDate.getDate()}日（{WD[selDate.getDay()]}）
              </p>
              {sel && sel.answers > 0 ? (
                <p className="text-sm tabular-nums">
                  {sel.answers}問・正解 <b className="text-take">{sel.answers - sel.wrong}</b>・不正解{" "}
                  <b className="text-shu">{sel.wrong}</b>
                </p>
              ) : (
                <p className="text-sm text-muted">学習なし</p>
              )}
            </section>
          </>
        )}
      </Page>
    </>
  );
}
