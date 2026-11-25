"use client";

import { useEffect, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import FlashCards from "@/components/FlashCards";
import { useProgress } from "@/components/ProgressProvider";
import Quiz, { type QuizFormat, type QuizItem } from "@/components/Quiz";
import { REVIEW_SIZE, buildTodayReview } from "@/lib/review";
import { clearSession, loadSession, type Saved } from "@/lib/session-store";
import { getSettings } from "@/lib/settings";

const SAVE_KEY = "review";

export default function ReviewPage() {
  const { progress, loading } = useProgress();
  const [items, setItems] = useState<QuizItem[] | null>(null);
  const [format, setFormat] = useState<QuizFormat | "cards">("mix");
  const [started, setStarted] = useState(false);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [resume, setResume] = useState<Saved | null>(null);
  useEffect(() => {
    const s = loadSession(SAVE_KEY);
    setSaved(s);
    // 設定で「たずねない」にしていれば、確認せずに続きから再開する
    if (s && !getSettings().askResume) {
      setResume(s);
      setStarted(true);
    }
  }, []);

  // 学習記録が読み込まれたら一度だけ組み立てる
  useEffect(() => {
    if (!loading && items === null) setItems(buildTodayReview(progress));
  }, [loading, progress, items]);

  const counts = items
    ? items.reduce<Record<string, number>>((acc, it) => {
        const k = it.reason?.replace(/\d+/, "N") ?? "";
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {})
    : {};
  const priority = items?.filter((x) => x.kind === "priority").length ?? 0;
  const newSet = (
    <button
      className="btn"
      onClick={() => {
        setItems(buildTodayReview(progress, REVIEW_SIZE));
        clearSession(SAVE_KEY);
        setSaved(null);
        setResume(null);
        setStarted(false);
        window.scrollTo(0, 0);
      }}
    >
      新しい{REVIEW_SIZE}問を作る
    </button>
  );

  return (
    <>
      <AppBar title="今日の復習" back="/" />
      <Page>
        {!items ? (
          <p className="py-16 text-center text-muted">問題を用意しています…</p>
        ) : !started ? (
          <>
          {saved && (
            <section className="panel grid gap-2 border-ai p-4">
              <p className="text-sm">
                <b>中断した復習があります</b>
                <span className="ml-1.5 tabular-nums text-muted">
                  {saved.kind === "cards" ? "単語カード" : "クイズ"}・{saved.i} / {saved.total}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setResume(saved);
                    setStarted(true);
                  }}
                >
                  続きから
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    clearSession(SAVE_KEY);
                    setSaved(null);
                  }}
                >
                  破棄する
                </button>
              </div>
            </section>
          )}
          <section className="panel grid gap-4 p-5">
            <div>
              <p className="font-word text-[34px] font-black leading-none tabular-nums">
                {items.length}
                <small className="ml-1 font-body text-sm font-medium text-muted">問</small>
              </p>
              <p className="mt-2 text-sm text-muted">
                数日前に間違えた単語・苦手リストの単語・しばらく学習していない単語を優先して {priority} 問、
                残り {items.length - priority} 問は全範囲から普通の単語を混ぜています。
              </p>
            </div>
            <ul className="grid gap-1 text-[13px]">
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <li key={k} className="flex justify-between border-b border-dashed border-line pb-1">
                    <span>{k.replace("N", "数")}</span>
                    <span className="tabular-nums text-muted">{v} 問</span>
                  </li>
                ))}
            </ul>
            <div>
              <h3 className="mb-1.5 text-[13px] text-muted">出題の形式</h3>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["mix", "クイズ（ミックス）"],
                    ["w2m", "クイズ（古語 → 意味）"],
                    ["m2w", "クイズ（意味 → 古語）"],
                    ["cards", "単語カード"],
                  ] as [QuizFormat | "cards", string][]
                ).map(([v, l]) => (
                  <button key={v} className="seg-btn" aria-pressed={format === v} onClick={() => setFormat(v)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={() => {
                clearSession(SAVE_KEY);
                setResume(null);
                setStarted(true);
              }}
            >
              はじめる
            </button>
            {priority === 0 && (
              <p className="text-xs text-muted">
                まだ学習記録が少ないので、今回はほとんどがランダムな単語です。カードやクイズで学習すると、次回から間違えた単語が優先されます。
              </p>
            )}
            {saved && <p className="text-xs text-muted">「はじめる」を押すと、中断中の復習は新しい{items.length}問に置きかわります。</p>}
          </section>
          </>
        ) : resume?.kind === "cards" ? (
          <FlashCards
            words={[]}
            title="今日の復習"
            recordMode="review"
            saveKey={SAVE_KEY}
            saveHref="/review"
            resume={resume}
            footer={newSet}
          />
        ) : resume?.kind === "quiz" ? (
          <Quiz items={[]} format="mix" title="今日の復習" recordMode="review" footer={newSet} saveKey={SAVE_KEY} saveHref="/review" resume={resume} />
        ) : format === "cards" ? (
          <FlashCards
            saveKey={SAVE_KEY}
            saveHref="/review"
            words={items.map((x) => x.word)}
            title="今日の復習"
            recordMode="review"
            badges={Object.fromEntries(items.map((x) => [x.word.n, { text: x.reason ?? "", priority: x.kind === "priority" }]))}
            footer={newSet}
          />
        ) : (
          <Quiz items={items} format={format} title="今日の復習" recordMode="review" footer={newSet} saveKey={SAVE_KEY} saveHref="/review" />
        )}
      </Page>
    </>
  );
}
