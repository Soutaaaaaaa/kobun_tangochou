"use client";

import { useMemo, useState } from "react";
import { BOOKS } from "@/lib/books";
import { ALL_WORDS, CIRC, REL_LABEL, noLabel, type BookId, type Word } from "@/lib/words";
import { MeanText, ShortMean } from "./Mean";
import TipBox from "./TipBox";

const MAX = 30;
/** カタカナ→ひらがな、空白を除く */
const norm = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)).replace(/\s+/g, "");
const plainMeans = (w: Word) => w.means.map((m) => m.replace(/^\[[^\]]+\]/, "").replace(/《[^》]+》/g, "")).join("／");

/** 読み・漢字・意味のどれかで探す。読みが近いものほど上に出す */
function search(q: string, book: BookId): Word[] {
  const s = norm(q);
  if (!s) return [];
  const scored: [number, Word][] = [];
  for (const w of ALL_WORDS) {
    const keys = w.word.split("・").map((k) => k.replace(/〜/g, ""));
    let sc = -1;
    if (keys.some((k) => k === s)) sc = 0;
    else if (keys.some((k) => k.startsWith(s))) sc = 1;
    else if (keys.some((k) => k.includes(s))) sc = 2;
    else if (w.kanji.includes(q.trim())) sc = 2;
    else if (plainMeans(w).includes(s)) sc = 3;
    if (sc >= 0) scored.push([sc + (w.book === book ? 0 : 0.5) + (w.rel || w.extra ? 0.2 : 0), w]);
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].n - b[1].n).map((x) => x[1]);
}

/** トップ画面の「単語を調べる」 */
export default function WordSearch({ book }: { book: BookId }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const hits = useMemo(() => search(q, book), [q, book]);

  return (
    <section className="grid gap-1.5">
      <h2 className="px-0.5 text-[13px] font-bold text-muted">単語を調べる</h2>
      <div className="relative">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(null);
          }}
          placeholder="読み・漢字・意味（例：あはれ、心、気の毒）"
          aria-label="単語を調べる"
          enterKeyHint="search"
          className="h-12 w-full rounded-xl border-[1.5px] border-line bg-surface pl-10 pr-3 text-[16px] text-ink outline-none placeholder:text-muted focus:border-ai"
        />
      </div>
      {q.trim() && (
        <div className="panel overflow-hidden">
          {hits.length === 0 && <p className="px-3.5 py-3 text-sm text-muted">見つかりませんでした</p>}
          {hits.slice(0, MAX).map((w) => {
            const isOpen = open === w.n;
            return (
              <div key={w.n} className="border-t border-line first:border-t-0">
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : w.n)}
                  aria-expanded={isOpen}
                  className="grid w-full gap-0.5 px-3.5 py-2.5 text-left hover:bg-surface-2"
                >
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    <b className="font-word text-[17px] font-black">{w.word}</b>
                    <small className="text-xs text-muted">
                      {w.kanji && `［${w.kanji}］`}
                      {noLabel(w)}
                      {w.rel && `（${REL_LABEL[w.rel]}）`}
                    </small>
                    <span className="ml-auto rounded bg-surface-2 px-1.5 text-[11px] text-muted">{BOOKS.find((b) => b.id === w.book)?.name}</span>
                  </span>
                  {!isOpen && (
                    <span className="truncate text-[13px] text-ink">
                      <ShortMean w={w} />
                    </span>
                  )}
                </button>
                {isOpen && (
                  <div className="grid gap-2 px-3.5 pb-3">
                    <ol className="grid gap-0.5 text-[14px] leading-relaxed text-ink">
                      {w.means.map((m, i) => (
                        <li key={i}>
                          {w.means.length > 1 && <span className="mr-1 text-muted">{CIRC[i]}</span>}
                          <MeanText m={m} />
                        </li>
                      ))}
                    </ol>
                    <TipBox w={w} />
                  </div>
                )}
              </div>
            );
          })}
          {hits.length > MAX && <p className="border-t border-line px-3.5 py-2 text-xs text-muted">ほか {hits.length - MAX} 件。言葉を足して絞り込んでください</p>}
        </div>
      )}
    </section>
  );
}
