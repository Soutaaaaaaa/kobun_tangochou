"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import FlashCards from "@/components/FlashCards";
import { useProgress } from "@/components/ProgressProvider";
import Quiz, { type QuizFormat } from "@/components/Quiz";
import { isKnown } from "@/lib/progress";
import { clearSession, loadSession, type Saved } from "@/lib/session-store";
import { getSettings } from "@/lib/settings";
import { studyHref } from "@/lib/study-url";
import { weightedByProgress } from "@/lib/weight";
import { BOOK_SIZE, BYNUM, isBookId, parseRanges, shuffle, wordsInRanges, type Word } from "@/lib/words";

function Study() {
  const params = useSearchParams();
  const { progress, loading } = useProgress();
  const key = params.toString();
  const mode = params.get("mode") === "quiz" ? "quiz" : "cards";
  const title = params.get("t") || (mode === "quiz" ? "クイズ" : "単語カード");
  const format = (["mix", "w2m", "m2w"].includes(params.get("q") ?? "") ? params.get("q") : "mix") as QuizFormat;
  const [words, setWords] = useState<Word[] | null>(null);
  const saveKey = `study:${key}`;
  /** 前回中断した続き。undefined = まだ確認していない、null = なし／最初から */
  const [saved, setSaved] = useState<Saved | null | undefined>(undefined);
  const [resume, setResume] = useState<Saved | null>(null);

  // 出題リストは学習記録の読み込み後に一度だけ作る（途中で記録が変わっても並びは変えない）
  useEffect(() => {
    if (loading) return;
    const p = new URLSearchParams(key);
    const bk = isBookId(p.get("b")) ? (p.get("b") as "kobun315") : "kobun400";
    const ranges = parseRanges(p.get("r"), BOOK_SIZE[bk]);
    let list: Word[] = p.get("ids")
      ? p
          .get("ids")!
          .split(",")
          .map((x) => BYNUM.get(Number(x)))
          .filter((w): w is Word => !!w)
      : wordsInRanges(ranges, bk, p.get("rel") === "1");
    if (p.get("weak") === "1") list = list.filter((w) => progress.get(w.n)?.is_weak);
    if (p.get("nk") === "1") list = list.filter((w) => !isKnown(progress.get(w.n)));
    const n = Number(p.get("n") ?? 0);
    const random = p.get("order") !== "seq";
    // 苦手リストからの出題は、間違えやすい・しばらく見ていない語が少しだけ出やすい
    const weighted = p.get("w") === "1" || p.get("weak") === "1";
    const mix = (l: Word[]) => (weighted ? weightedByProgress(l, progress) : shuffle(l));
    if (n > 0 && n < list.length) {
      list = mix(list).slice(0, n);
      if (!random) list.sort((a, b) => a.n - b.n);
    } else if (random) list = mix(list);
    setWords(list);
    const s = loadSession(`study:${key}`);
    const ok = s && s.kind === (mode === "quiz" ? "quiz" : "cards") ? s : null;
    // 設定：ask＝たずねる／resume＝確認せずに続きから／fresh＝いつも最初から
    const rm = getSettings().resumeMode;
    if (ok && rm === "fresh") clearSession(`study:${key}`);
    setSaved(rm === "fresh" ? null : ok);
    setResume(ok && rm === "resume" ? ok : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loading]);

  const book = isBookId(params.get("b")) ? (params.get("b") as "kobun315") : "kobun400";
  const ranges = parseRanges(params.get("r"), BOOK_SIZE[book]);
  const rel = params.get("rel") === "1";
  return (
    <>
      <AppBar title={`${title}：${mode === "quiz" ? "クイズ" : "カード"}`} back="/" />
      <Page>
        {words === null || saved === undefined ? (
          <p className="py-16 text-center text-muted">読み込み中…</p>
        ) : words.length === 0 ? (
          <p className="panel p-6 text-center text-muted">この条件に当てはまる単語がありません。</p>
        ) : saved && !resume ? (
          <section className="panel grid gap-3 p-5 text-center">
            <p className="text-sm text-muted">前回中断した続きがあります</p>
            <p className="font-word text-4xl font-black tabular-nums">
              {saved.i}
              <small className="text-lg text-muted"> / {saved.total}</small>
            </p>
            <button className="btn btn-primary" onClick={() => setResume(saved)}>
              続きから（{saved.i + 1}{mode === "quiz" ? "問" : "語"}目から）
            </button>
            <button
              className="btn"
              onClick={() => {
                clearSession(saveKey);
                setSaved(null);
              }}
            >
              最初から
            </button>
          </section>
        ) : mode === "cards" ? (
          <FlashCards
            key={`${key}-${resume ? "r" : "n"}`}
            saveKey={saveKey}
            saveHref={`/study?${key}`}
            resume={resume?.kind === "cards" ? resume : undefined}
            words={words}
            title={title}
            quizHref={ranges.length ? studyHref({ mode: "quiz", ranges, order: "random", format: "mix", title, book, includeRelated: rel }) : undefined}
          />
        ) : (
          <Quiz
            key={`${key}-${resume ? "r" : "n"}`}
            items={words.map((word) => ({ word }))}
            format={format}
            title={title}
            recordMode="quiz"
            saveKey={saveKey}
            saveHref={`/study?${key}`}
            resume={resume?.kind === "quiz" ? resume : undefined}
          />
        )}
      </Page>
    </>
  );
}

export default function StudyPage() {
  return (
    <Suspense>
      <Study />
    </Suspense>
  );
}
