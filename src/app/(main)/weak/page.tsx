"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";
import WordList from "@/components/WordList";
import { createClient } from "@/lib/supabase/client";
import { fmtDateTime } from "@/lib/progress";
import { studyHref } from "@/lib/study-url";
import { BYNUM, WORDS } from "@/lib/words";

type Log = { id: number; word_no: number; correct: boolean; mode: string; created_at: string };
const MODE_LABEL: Record<string, string> = { card: "カード", quiz: "クイズ", review: "今日の復習" };

export default function WeakPage() {
  const { progress, userId } = useProgress();
  const [logs, setLogs] = useState<Log[] | null>(null);

  const weak = useMemo(
    () =>
      WORDS.filter((w) => progress.get(w.n)?.is_weak).sort((a, b) =>
        (progress.get(b.n)?.last_wrong_at ?? "").localeCompare(progress.get(a.n)?.last_wrong_at ?? ""),
      ),
    [progress],
  );

  useEffect(() => {
    createClient()
      .from("study_logs")
      .select("id,word_no,correct,mode,created_at")
      .eq("user_id", userId)
      .eq("correct", false)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => setLogs((data as Log[]) ?? []));
  }, [userId]);

  const ids = weak.map((w) => w.n);
  return (
    <>
      <AppBar title="苦手リスト" back="/" />
      <Page>
        <section className="panel grid gap-3 p-4">
          <p className="font-word text-[34px] font-black leading-none tabular-nums">
            {weak.length}
            <small className="ml-1 font-body text-sm font-medium text-muted">語</small>
          </p>
          <p className="text-[13px] text-muted">
            間違えた単語は自動で入ります。カードで「覚えた」にするか、クイズで2回続けて正解すると外れます。各単語の「苦手」ボタンでも出し入れできます。
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              className={`btn btn-primary ${ids.length ? "" : "pointer-events-none opacity-45"}`}
              href={studyHref({ mode: "cards", ids, order: "random", title: "苦手な単語" })}
            >
              カードで覚える
            </Link>
            <Link
              className={`btn ${ids.length ? "" : "pointer-events-none opacity-45"}`}
              href={studyHref({ mode: "quiz", ids, order: "random", format: "mix", title: "苦手な単語" })}
            >
              四択クイズ
            </Link>
          </div>
        </section>

        {weak.length ? <WordList words={weak} /> : <p className="panel p-6 text-center text-muted">苦手な単語はありません。</p>}

        <h2 className="-mb-2 px-0.5 text-[13px] text-muted">最近間違えた記録</h2>
        <div className="panel overflow-hidden">
          {logs === null ? (
            <p className="p-4 text-center text-sm text-muted">読み込み中…</p>
          ) : logs.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted">まだ記録はありません。</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex items-baseline gap-3 border-t border-line px-3.5 py-2 text-sm first:border-t-0">
                <span className="w-[8.5em] shrink-0 text-xs tabular-nums text-muted">{fmtDateTime(l.created_at)}</span>
                <b className="min-w-0 flex-1 truncate font-word">{BYNUM.get(l.word_no)?.word}</b>
                <span className="text-xs text-muted">{MODE_LABEL[l.mode] ?? l.mode}</span>
              </div>
            ))
          )}
        </div>
      </Page>
    </>
  );
}
