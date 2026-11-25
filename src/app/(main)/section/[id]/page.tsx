"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";
import WordList from "@/components/WordList";
import { isKnown } from "@/lib/progress";
import { studyHref } from "@/lib/study-url";
import { useSettings } from "@/lib/settings";
import { sectionById, sectionGroups, sectionWords } from "@/lib/words";
import RelatedToggle from "@/components/RelatedToggle";

const PREF_KEY = "kobun400-section-prefs";

export default function SectionPage() {
  const { id } = useParams<{ id: string }>();
  const s = sectionById(decodeURIComponent(id));
  const { progress } = useProgress();
  const [{ includeRelated }] = useSettings();
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
  const is315 = s.book === "kobun315";
  const rel = is315 && includeRelated;
  // 覚えた数は見出し語で数える。一覧には関連語も出す
  const ws = sectionWords(s);
  const listed = is315 ? sectionWords(s, true) : ws;
  const relCount = listed.length - ws.length;
  const k = ws.filter((w) => isKnown(progress.get(w.n))).length;
  const notKnown = ws.length - k;
  const title = s.extra ? `315 おまけ ${s.num}` : is315 ? `315 セクション ${s.num}` : `セクション ${s.num}`;
  const ranges: [number, number][] = [[s.from, s.to]];

  return (
    <>
      <AppBar title={title} back="/" />
      <Page>
        <section className="panel grid gap-3 p-4" style={{ ["--cc" as string]: s.cat.color }}>
          <span className="chip-dot text-xs font-bold" style={{ color: s.cat.color }}>
            {s.extra ? (
              <>おまけ（慣用句・言い換え）　{sectionGroups(s).length}グループ</>
            ) : (
              <>
                {s.cat.name}　No.{s.from}–{s.to}
              </>
            )}
            {is315 && relCount > 0 && <span className="ml-1 font-normal text-muted">（関連語 {relCount}語）</span>}
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
                book: s.book,
                includeRelated: rel,
              })}
            >
              単語カード
            </Link>
            <Link className="btn" href={studyHref({ mode: "quiz", ranges, order: "random", format: "mix", title, book: s.book, includeRelated: rel })}>
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
          {is315 && !s.extra && <RelatedToggle />}
          <Link href={`/random?sec=${s.id}${is315 ? "&b=kobun315" : ""}`} className="text-center text-[13px] font-bold text-ai">
            このセクションを含めて範囲を選び、ランダム出題する →
          </Link>
        </section>
        <WordList words={listed} />
      </Page>
    </>
  );
}
