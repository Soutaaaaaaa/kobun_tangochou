"use client";

import Link from "next/link";
import { addDays, computeStreak, dayKey } from "@/lib/streak";
import Flame from "./Flame";
import { useProgress } from "./ProgressProvider";

const WD = ["日", "月", "火", "水", "木", "金", "土"];

/** トップに出す連続日数（ほのお）と直近1週間 */
export default function StreakCard() {
  const { days } = useProgress();
  if (!days) return <section className="panel h-[132px] animate-pulse" aria-label="連続日数を読み込み中" />;

  const today = new Date();
  const s = computeStreak(days, today);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <Link href="/calendar" className="panel flex items-center gap-4 p-4 hover:bg-surface-2" aria-label="学習カレンダーを開く">
      <Flame streak={s.current} lit={s.studiedToday} base={60} max={120} />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="font-word text-[26px] font-black leading-none">
          {s.current}
          <small className="ml-1 font-body text-sm font-bold">日連続</small>
        </p>
        <p className={`text-xs font-bold ${s.studiedToday ? "text-take" : "text-shu"}`}>
          {s.studiedToday
            ? "今日も学習しました"
            : s.current > 0
              ? `今日1問解くと ${s.current + 1}日連続`
              : "今日1問解いて、連続記録をはじめよう"}
        </p>
        <div className="flex gap-1" aria-label="直近7日間">
          {week.map((d) => {
            const k = dayKey(d);
            const on = (days.get(k)?.answers ?? 0) > 0;
            const isToday = k === dayKey(today);
            return (
              <span key={k} className="grid flex-1 justify-items-center gap-0.5">
                <span className={`text-[10px] ${isToday ? "font-bold text-ink" : "text-muted"}`}>{WD[d.getDay()]}</span>
                <span
                  className={`h-3.5 w-3.5 rounded-full border ${on ? "border-transparent" : "border-line"} ${isToday ? "ring-1 ring-ink ring-offset-1 ring-offset-surface" : ""}`}
                  style={on ? { background: "var(--flame-2)" } : undefined}
                />
              </span>
            );
          })}
        </div>
        <p className="text-[11px] text-muted">
          最長 {s.best}日・学習した日 {s.totalDays}日　<span className="font-bold text-ai">カレンダー →</span>
        </p>
      </div>
    </Link>
  );
}
