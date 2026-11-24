"use client";

import Link from "next/link";
import { logout } from "../auth-actions";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";
import { ago, isKnown } from "@/lib/progress";
import { REVIEW_SIZE } from "@/lib/review";
import { CATS, SECTIONS, WORDS, sectionWords } from "@/lib/words";

export default function Home() {
  const { username, progress, loading } = useProgress();
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
          <form action={logout} className="flex items-center gap-2 text-[13px] text-muted">
            <span className="max-w-[9em] truncate" title="ログイン中のアカウント">
              {username}
            </span>
            <button className="rounded-md border border-line px-2 py-1 text-xs font-bold text-ink">ログアウト</button>
          </form>
        }
      />
      <Page>
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
