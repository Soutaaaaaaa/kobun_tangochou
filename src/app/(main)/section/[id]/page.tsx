"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";
import WordList from "@/components/WordList";
import { isKnown } from "@/lib/progress";
import { studyHref } from "@/lib/study-url";
import { SECTIONS, sectionWords } from "@/lib/words";

const PREF_KEY = "kobun400-section-prefs";

export default function SectionPage() {
  const { id } = useParams<{ id: string }>();
  const s = SECTIONS[Number(id) - 1];
  const { progress } = useProgress();
  const [shuffle, setShuffle] = useState(false);
  const [onlyNotKnown, setOnlyNotKnown] = useState(false);

  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
      setShuffle(!!p.shuffle);
      setOnlyNotKnown(!!p.onlyNotKnown);
    } catch {}
  }, []);
  const savePrefs = (next: { shuffle: boolean; onlyNotKnown: boolean }) => {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
    } catch {}
  };

  if (!s) notFound();
  const ws = sectionWords(s);
  const k = ws.filter((w) => isKnown(progress.get(w.n))).length;
  const notKnown = ws.length - k;
  const title = `セクション ${s.id}`;
  const ranges: [number, number][] = [[s.from, s.to]];

  return (
    <>
      <AppBar title={title} back="/" />
      <Page>
        <section className="panel grid gap-3 p-4" style={{ ["--cc" as string]: s.cat.color }}>
          <span className="chip-dot text-xs font-bold" style={{ color: s.cat.color }}>
            {s.cat.name}　No.{s.from}–{s.to}
          </span>
          <div className="font-word text-[34px] font-black leading-none tabular-nums">
            {k}
            <small className="ml-1 font-body text-sm font-medium text-muted">/ {ws.length} 語 覚えた</small>
          </div>
          <div className="meter">
            <i style={{ width: `${(k / ws.length) * 100}%` }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link
              className="btn btn-primary"
              href={studyHref({
                mode: "cards",
                ranges,
                order: shuffle ? "random" : "seq",
                notKnownOnly: onlyNotKnown && notKnown > 0,
                title,
              })}
            >
              単語カード
            </Link>
            <Link className="btn" href={studyHref({ mode: "quiz", ranges, order: "random", format: "mix", title })}>
              四択クイズ
            </Link>
          </div>
          <div className="flex flex-wrap gap-4 text-[13px] text-muted">
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--ai)]"
                checked={shuffle}
                onChange={(e) => {
                  setShuffle(e.target.checked);
                  savePrefs({ shuffle: e.target.checked, onlyNotKnown });
                }}
              />
              シャッフル
            </label>
            <label className="inline-flex cursor-pointer items-center gap-1.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--ai)]"
                checked={onlyNotKnown}
                onChange={(e) => {
                  setOnlyNotKnown(e.target.checked);
                  savePrefs({ shuffle, onlyNotKnown: e.target.checked });
                }}
              />
              覚えていない語だけ（{notKnown}語）
            </label>
          </div>
          <Link href={`/random?sec=${s.id}`} className="text-center text-[13px] font-bold text-ai">
            このセクションを含めて範囲を選び、ランダム出題する →
          </Link>
        </section>
        <WordList words={ws} />
      </Page>
    </>
  );
}
