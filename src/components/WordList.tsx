"use client";

import { ago, isKnown, type WordProgress } from "@/lib/progress";
import { Fragment } from "react";
import { REL_LABEL, groupById, type Word } from "@/lib/words";
import { InlineMeans } from "./Mean";
import { useProgress } from "./ProgressProvider";

function StatusDot({ p }: { p?: WordProgress }) {
  const cls = p?.is_weak ? "bg-shu border-shu" : isKnown(p) ? "bg-take border-take" : "border-line";
  const label = p?.is_weak ? "苦手" : isKnown(p) ? "覚えた" : p?.last_studied_at ? "学習中" : "未学習";
  return <span title={label} aria-label={label} className={`mt-[7px] inline-block h-2.5 w-2.5 shrink-0 rounded-full border-[1.5px] ${cls}`} />;
}

export default function WordList({ words, showHistory = true }: { words: Word[]; showHistory?: boolean }) {
  const { progress, setWeak } = useProgress();
  return (
    <div className="panel overflow-hidden">
      {words.map((w, i) => {
        const p = progress.get(w.n);
        // おまけ：グループが変わるところに見出しを入れる
        const groupHead = w.group && w.group !== words[i - 1]?.group ? groupById(w.group) : undefined;
        return (
          <Fragment key={w.n}>
          {groupHead && (
            <div className="border-t border-line bg-surface-2 px-3.5 py-2 text-[13px] font-bold first:border-t-0">{groupHead.title}</div>
          )}
          <div
            className={`grid grid-cols-[4.2ch_1fr_auto] items-start gap-2.5 border-t border-line px-3.5 py-2.5 first:border-t-0 ${w.rel ? "bg-surface-2/60" : ""}`}
          >
            <span className={`pt-1 text-xs tabular-nums text-muted ${w.rel ? "pl-1" : ""}`} title={w.extra ? w.no : undefined}>
              {w.extra ?? w.no}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                {w.rel && (
                  <span className="rounded border border-line px-1 text-[10px] font-bold text-muted" title={REL_LABEL[w.rel]}>
                    {w.rel}
                  </span>
                )}
                <b className={`font-word font-black ${w.rel ? "text-[15px]" : "text-[17px]"}`}>{w.word}</b>
                <small className="text-xs text-muted">
                  {w.kanji && `（${w.kanji}）`}
                  {w.pos}
                </small>
              </div>
              <div className="mt-0.5 text-[13px] text-muted">
                <InlineMeans w={w} />
              </div>
              {showHistory && p?.last_studied_at && (
                <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted">
                  <span>最終学習 {ago(p.last_studied_at)}</span>
                  {p.last_wrong_at && <span className="text-shu">最後に間違えた {ago(p.last_wrong_at)}</span>}
                  <span className="tabular-nums">
                    正解 {p.correct_count}・不正解 {p.wrong_count}
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col items-center gap-1">
              <StatusDot p={p} />
              <button
                onClick={() => setWeak(w.n, !p?.is_weak)}
                className={`rounded-md px-1.5 py-1 text-[11px] font-bold ${p?.is_weak ? "bg-shu-soft text-shu" : "text-muted"}`}
                aria-pressed={!!p?.is_weak}
                title={p?.is_weak ? "苦手リストから外す" : "苦手リストに追加"}
              >
                {p?.is_weak ? "苦手" : "＋苦手"}
              </button>
            </div>
          </div>
          </Fragment>
        );
      })}
    </div>
  );
}
