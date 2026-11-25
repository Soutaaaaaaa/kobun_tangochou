"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { distractors, type QuizDir } from "@/lib/distractors";
import type { StudyMode } from "@/lib/progress";
import { catOf, homographHint, shuffle, type Word } from "@/lib/words";
import { InlineMeans, QuizMean, ShortMean } from "./Mean";
import { useProgress } from "./ProgressProvider";

export type QuizFormat = "mix" | QuizDir;
export type QuizItem = { word: Word; reason?: string; kind?: "priority" | "normal" };

type Props = {
  items: QuizItem[];
  format: QuizFormat;
  title: string;
  recordMode: Exclude<StudyMode, "card">;
  /** 結果画面の追加ボタン */
  footer?: React.ReactNode;
};

type Question = { item: QuizItem; dir: QuizDir; choices: Word[] };

const makeQuestions = (items: QuizItem[], format: QuizFormat): Question[] =>
  items.map((item) => {
    const dir: QuizDir = format === "mix" ? (Math.random() < 0.5 ? "w2m" : "m2w") : format;
    return { item, dir, choices: shuffle([item.word, ...distractors(item.word, dir)]) };
  });

export default function Quiz({ items, format, title, recordMode, footer }: Props) {
  const { record } = useProgress();
  const [source, setSource] = useState(items);
  const questions = useMemo(() => makeQuestions(source, format), [source, format]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [missed, setMissed] = useState<QuizItem[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (picked !== null) nextRef.current?.focus();
  }, [picked]);

  const restart = (list: QuizItem[]) => {
    setSource(shuffle(list));
    setI(0);
    setPicked(null);
    setScore(0);
    setMissed([]);
    window.scrollTo(0, 0);
  };

  /* ---------- 結果 ---------- */
  if (i >= questions.length) {
    const total = questions.length;
    const cardsFor = missed.map((m) => m.word.n).join(",");
    const priority = questions.filter((q) => q.item.kind === "priority").length;
    return (
      <div className="flex flex-col gap-4">
        <section className="panel grid gap-1.5 px-4 py-6 text-center">
          <p className="text-sm text-muted">{title}</p>
          <div className="font-word text-5xl font-black tabular-nums">
            {score}
            <small className="text-xl text-muted"> / {total}</small>
          </div>
          <p className="text-sm text-muted">
            正答率 {total ? Math.round((score / total) * 100) : 0}%{priority > 0 && `（優先して出した語 ${priority} 問を含む）`}
          </p>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-primary" disabled={!missed.length} onClick={() => restart(missed)}>
            間違えた {missed.length} 問を解き直す
          </button>
          {missed.length > 0 ? (
            <Link className="btn" href={`/study?mode=cards&ids=${cardsFor}&order=seq&t=${encodeURIComponent("間違えた単語")}`}>
              間違えた語をカードで
            </Link>
          ) : (
            <button className="btn" disabled>
              間違えた語をカードで
            </button>
          )}
        </div>
        {footer}
        <Link className="btn" href="/">
          トップへ
        </Link>
        {missed.length > 0 && (
          <>
            <p className="-mb-2 px-0.5 text-[13px] text-muted">間違えた単語</p>
            <div className="panel overflow-hidden">
              {missed.map(({ word: w }) => (
                <div key={w.n} className="border-t border-line px-3.5 py-2.5 first:border-t-0">
                  <span className="mr-2 text-xs tabular-nums text-muted">{w.n}</span>
                  <b className="font-word text-[17px] font-black">{w.word}</b>
                  <div className="mt-0.5 text-[13px] text-muted">
                    <InlineMeans w={w} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---------- 問題 ---------- */
  const q = questions[i];
  const t = q.item.word;
  const answered = picked !== null;
  const right = picked === t.n;

  const choose = (n: number) => {
    if (answered) return;
    setPicked(n);
    const ok = n === t.n;
    record(t.n, ok, recordMode);
    if (ok) setScore((s) => s + 1);
    else setMissed((m) => [...m, q.item]);
  };
  const next = () => {
    setPicked(null);
    setI((x) => x + 1);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <div className="flex justify-between text-[13px] tabular-nums text-muted">
          <span>
            {i + 1} / {questions.length}
          </span>
          <span className="font-bold text-take">正解 {score}</span>
        </div>
        <div className="meter">
          <i style={{ width: `${(i / questions.length) * 100}%`, background: "var(--ai)" }} />
        </div>
      </div>

      <section className="panel relative grid gap-1.5 overflow-hidden p-5 text-center">
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: catOf(t.n).color }} />
        {q.item.reason && (
          <span
            className={`justify-self-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
              q.item.kind === "priority" ? "bg-shu-soft text-shu" : "bg-surface-2 text-muted"
            }`}
          >
            {q.item.reason}
          </span>
        )}
        {q.dir === "w2m" ? (
          <>
            <span className="text-xs text-muted">この古語の意味は？</span>
            <div className="font-word text-[clamp(30px,9vw,42px)] font-black leading-tight">{t.word}</div>
            {/* 漢字表記はヒントになるので解答後にだけ出す */}
            {answered && t.kanji && <div className="text-[15px] text-muted">{t.kanji}</div>}
            <span className="flex flex-wrap justify-center gap-1.5">
              <span className="rounded border border-line px-1.5 text-xs text-muted">{t.pos}</span>
              {homographHint(t) && <span className="rounded bg-surface-2 px-1.5 text-xs font-bold text-muted">{homographHint(t)}</span>}
            </span>
          </>
        ) : (
          <>
            <span className="text-xs text-muted">この意味をもつ古語は？</span>
            <div className="text-[17px] font-bold leading-relaxed text-shu">
              <QuizMean w={t} />
            </div>
          </>
        )}
      </section>

      <div className="grid gap-2">
        {q.choices.map((o, k) => {
          const isAns = o.n === t.n;
          const state = answered ? (isAns ? "border-take bg-take-soft" : picked === o.n ? "border-shu bg-shu-soft" : "") : "";
          return (
            <button
              key={o.n}
              onClick={() => choose(o.n)}
              disabled={answered}
              className={`grid min-h-[52px] grid-cols-[1.6em_1fr] items-start gap-2 rounded-xl border-[1.5px] border-line bg-surface px-3.5 py-3 text-left text-ink ${state}`}
            >
              <span className="font-bold tabular-nums text-muted">{"ABCD"[k]}</span>
              <span className={q.dir === "m2w" ? "font-word text-xl font-black" : "text-[15px] leading-normal"}>
                {q.dir === "w2m" ? <QuizMean w={o} /> : o.word}
                {answered && (
                  <span className="mt-1 block font-body text-xs font-normal text-muted">
                    {q.dir === "w2m" ? (
                      <>
                        <b className="font-word text-sm text-ink">{o.word}</b>
                        {o.kanji && `［${o.kanji}］`}（No.{o.n}）
                      </>
                    ) : (
                      <>
                        {o.kanji && <span className="mr-1 font-word text-ink">［{o.kanji}］</span>}
                        <ShortMean w={o} />
                      </>
                    )}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <p className={`min-h-[1.6em] text-center font-bold ${right ? "text-take" : "text-shu"}`}>
        {answered && (right ? "正解！" : `不正解　正解は「${t.word}」`)}
      </p>
      {answered && (
        <button ref={nextRef} className="btn btn-primary" onClick={next}>
          {i + 1 < questions.length ? "次の問題" : "結果を見る"}
        </button>
      )}
    </div>
  );
}
