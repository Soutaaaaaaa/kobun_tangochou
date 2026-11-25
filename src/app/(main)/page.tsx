"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";
import StreakCard from "@/components/StreakCard";
import { ago, isKnown } from "@/lib/progress";
import { BOOKS } from "@/lib/books";
import { REVIEW_SIZE } from "@/lib/review";
import { clearSession, listSessions } from "@/lib/session-store";
import { CATS, SECTIONS, WORDS, sectionWords } from "@/lib/words";

export default function Home() {
  const { username, isAdmin, progress, loading } = useProgress();
  const [paused, setPaused] = useState<ReturnType<typeof listSessions>>([]);
  useEffect(() => setPaused(listSessions()), []);
  const known = WORDS.filter((w) => isKnown(progress.get(w.n))).length;
  const weak = WORDS.filter((w) => progress.get(w.n)?.is_weak).length;
  const lastStudied = [...progress.values()].reduce<string | null>(
    (acc, p) => (p.last_studied_at && (!acc || p.last_studied_at > acc) ? p.last_studied_at : acc),
    null,
  );

  return (
    <>
      <AppBar
        title="古典学習帳"
        right={
          <div className="flex items-center gap-2 text-sm">
            {isAdmin && (
              <Link href="/admin" className="flex h-10 items-center rounded-lg bg-ai-soft px-3 text-sm font-bold text-ai">
                管理
              </Link>
            )}
            <Link
              href="/settings"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-muted"
              title="設定"
              aria-label="設定"
            >
              <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </Link>
            <Link
              href="/account"
              className="flex h-10 max-w-[10em] items-center gap-1.5 rounded-lg border border-line px-3 text-sm font-bold"
              title="アカウント"
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
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
        {paused.length > 0 && (
          <section className="grid gap-1.5">
            <h2 className="px-0.5 text-[13px] font-bold text-muted">中断中の学習</h2>
            <div className="panel overflow-hidden">
              {paused.map((s) => (
                <div key={s.key} className="flex items-center gap-2 border-t border-line px-3.5 py-2.5 first:border-t-0">
                  <Link href={s.href} className="grid min-w-0 flex-1 gap-0.5">
                    <span className="truncate text-sm font-bold">{s.title}</span>
                    <span className="text-xs tabular-nums text-muted">
                      {s.kind === "cards" ? "単語カード" : "クイズ"}・{s.i} / {s.total}
                      {s.kind === "quiz" && `・正解 ${s.score}`}
                    </span>
                  </Link>
                  <Link href={s.href} className="btn min-h-[40px] px-3.5 py-2 text-sm">
                    続きから
                  </Link>
                  <button
                    aria-label="破棄"
                    title="破棄する"
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-xl leading-none text-muted"
                    onClick={() => {
                      clearSession(s.key);
                      setPaused(listSessions());
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
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

        {/* 単語帳（古文単語315・体系漢文は工事中） */}
        <section className="grid gap-1.5">
          <h2 className="px-0.5 text-[13px] font-bold text-muted">単語帳</h2>
          <div className="grid grid-cols-3 gap-2">
            {BOOKS.map((b) =>
              b.ready ? (
                <a
                  key={b.id}
                  href={`#${b.id}`}
                  className="panel relative grid content-between gap-2 border-[1.5px] border-ai p-3"
                  aria-current="true"
                >
                  <span className="grid gap-0.5">
                    <b className="font-word text-[15px] font-black leading-tight">{b.name}</b>
                    <span className="text-[11px] text-muted">{b.sub}</span>
                  </span>
                  <span className="grid gap-1">
                    <span className="text-[11px] tabular-nums text-muted">
                      <b className="text-sm text-ink">{loading ? "–" : known}</b>/400 語
                    </span>
                    <span className="meter h-[5px]">
                      <i style={{ width: `${known / 4}%` }} />
                    </span>
                  </span>
                </a>
              ) : (
                <div
                  key={b.id}
                  aria-disabled="true"
                  className="panel relative grid min-h-[104px] content-between gap-2 overflow-hidden p-3"
                >
                  <span className="grid gap-0.5 opacity-55">
                    <b className="font-word text-[15px] font-black leading-tight">{b.name}</b>
                    <span className="text-[11px] text-muted">{b.sub}</span>
                  </span>
                  <span className="kouji justify-self-center">工事中</span>
                  <span className="sr-only">（準備中のため、まだ使えません）</span>
                </div>
              ),
            )}
          </div>
        </section>

        <h2 id="kobun400" className="scroll-mt-16 px-0.5 pt-2 font-word text-xl font-black">
          古文単語400
        </h2>
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
