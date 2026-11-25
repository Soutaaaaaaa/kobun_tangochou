"use client";

import Link from "next/link";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";
import StreakCard from "@/components/StreakCard";
import { ago, isKnown } from "@/lib/progress";
import { REVIEW_SIZE } from "@/lib/review";
import { CATS, SECTIONS, WORDS, sectionWords } from "@/lib/words";

export default function Home() {
  const { username, isAdmin, progress, loading } = useProgress();
  const known = WORDS.filter((w) => isKnown(progress.get(w.n))).length;
  const weak = WORDS.filter((w) => progress.get(w.n)?.is_weak).length;
  const lastStudied = [...progress.values()].reduce<string | null>(
    (acc, p) => (p.last_studied_at && (!acc || p.last_studied_at > acc) ? p.last_studied_at : acc),
    null,
  );

  return (
    <>
      <AppBar
        title="古文単語400"
        right={
          <div className="flex items-center gap-1.5 text-[13px]">
            {isAdmin && (
              <Link href="/admin" className="rounded-md bg-ai-soft px-2 py-1 text-xs font-bold text-ai">
                管理
              </Link>
            )}
            <Link
              href="/account"
              className="flex max-w-[11em] items-center gap-1 rounded-md border border-line px-2 py-1 text-xs font-bold"
              title="アカウント設定"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
              </svg>
              <span className="truncate">{username}</span>
            </Link>
          </div>
        }
      />
      <Page>
        <StreakCard />
        <section className="panel grid gap-3 p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="font-word text-[34px] font-black leading-none tabular-nums">
              {loading ? "–" : known}
              <small className="ml-1 font-body text-sm font-medium text-muted">/ 400 語 覚えた</small>
            </div>
            <span className="text-[13px] text-muted">最終学習 {ago(lastStudied)}</span>
          </div>
          <div className="meter">
            <i style={{ width: `${known / 4}%` }} />
          </div>
          <Link href="/review" className="btn btn-primary min-h-[52px] text-[15px]">
            今日の復習（{REVIEW_SIZE}問）
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/random" className="btn">
              範囲を選んでランダム出題
            </Link>
            <Link href="/weak" className="btn">
              苦手リスト（{weak}語）
            </Link>
          </div>
        </section>

        {CATS.map((c) => {
          const secs = SECTIONS.filter((s) => s.cat === c);
          const cw = WORDS.filter((w) => w.n >= c.from && w.n <= c.to);
          return (
            <section key={c.id} className="grid gap-2" style={{ ["--cc" as string]: c.color }}>
              <div className="flex items-baseline gap-2.5 px-0.5 pt-1">
                <h2 className="chip-dot text-[17px] font-bold">{c.name}</h2>
                <span className="text-[13px] tabular-nums text-muted">
                  No.{c.from}–{c.to}　{cw.filter((w) => isKnown(progress.get(w.n))).length}/{cw.length}
                </span>
              </div>
              <div className="panel overflow-hidden">
                {secs.map((s) => {
                  const ws = sectionWords(s);
                  const k = ws.filter((w) => isKnown(progress.get(w.n))).length;
                  return (
                    <Link
                      key={s.id}
                      href={`/section/${s.id}`}
                      className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-line px-3.5 py-3 first:border-t-0 hover:bg-surface-2"
                    >
                      <span className="w-[2ch] text-center font-word text-xl font-black tabular-nums" style={{ color: c.color }}>
                        {s.id}
                      </span>
                      <span className="grid min-w-0 gap-1">
                        <span className="text-sm font-bold">
                          セクション {s.id}
                          <small className="ml-1.5 font-normal tabular-nums text-muted">
                            No.{s.from}–{s.to}・{ws.length}語
                          </small>
                        </span>
                        <span className="truncate text-xs text-muted">{ws.slice(0, 6).map((w) => w.word).join("・")}…</span>
                        <span className="meter h-[5px]">
                          <i style={{ width: `${(k / ws.length) * 100}%` }} />
                        </span>
                      </span>
                      <span className="text-right text-xs tabular-nums text-muted">
                        <b className="text-[15px] text-ink">{k}</b>/{ws.length}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </Page>
    </>
  );
}
