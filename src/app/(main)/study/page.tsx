"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import FlashCards from "@/components/FlashCards";
import { useProgress } from "@/components/ProgressProvider";
import Quiz, { type QuizFormat } from "@/components/Quiz";
import { isKnown } from "@/lib/progress";
import { studyHref } from "@/lib/study-url";
import { BYNUM, parseRanges, shuffle, wordsInRanges, type Word } from "@/lib/words";

function Study() {
  const params = useSearchParams();
  const { progress, loading } = useProgress();
  const key = params.toString();
  const mode = params.get("mode") === "quiz" ? "quiz" : "cards";
  const title = params.get("t") || (mode === "quiz" ? "クイズ" : "単語カード");
  const format = (["mix", "w2m", "m2w"].includes(params.get("q") ?? "") ? params.get("q") : "mix") as QuizFormat;
  const [words, setWords] = useState<Word[] | null>(null);

  // 出題リストは学習記録の読み込み後に一度だけ作る（途中で記録が変わっても並びは変えない）
  useEffect(() => {
    if (loading) return;
    const p = new URLSearchParams(key);
    const ranges = parseRanges(p.get("r"));
    let list: Word[] = p.get("ids")
      ? p
          .get("ids")!
          .split(",")
          .map((x) => BYNUM.get(Number(x)))
          .filter((w): w is Word => !!w)
      : wordsInRanges(ranges);
    if (p.get("weak") === "1") list = list.filter((w) => progress.get(w.n)?.is_weak);
    if (p.get("nk") === "1") list = list.filter((w) => !isKnown(progress.get(w.n)));
    const n = Number(p.get("n") ?? 0);
    const random = p.get("order") !== "seq";
    if (n > 0 && n < list.length) {
      list = shuffle(list).slice(0, n);
      if (!random) list.sort((a, b) => a.n - b.n);
    } else if (random) list = shuffle(list);
    setWords(list);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, loading]);

  const ranges = parseRanges(params.get("r"));
  return (
    <>
      <AppBar title={`${title}：${mode === "quiz" ? "クイズ" : "カード"}`} back="/" />
      <Page>
        {words === null ? (
          <p className="py-16 text-center text-muted">読み込み中…</p>
        ) : words.length === 0 ? (
          <p className="panel p-6 text-center text-muted">この条件に当てはまる単語がありません。</p>
        ) : mode === "cards" ? (
          <FlashCards
            key={key}
            words={words}
            title={title}
            quizHref={ranges.length ? studyHref({ mode: "quiz", ranges, order: "random", format: "mix", title }) : undefined}
          />
        ) : (
          <Quiz key={key} items={words.map((word) => ({ word }))} format={format} title={title} recordMode="quiz" />
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
