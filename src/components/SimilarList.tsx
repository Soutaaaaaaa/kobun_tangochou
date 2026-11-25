import { BOOKS } from "@/lib/books";
import { similarWords, type Similar } from "@/lib/similar";
import { groupById, noLabel, type Word } from "@/lib/words";
import { InlineMeans } from "./Mean";

/** 意味が近い単語の一覧（カードをめくった後・クイズに答えた後に出す） */
export default function SimilarList({ w, similar = similarWords(w) }: { w: Word; similar?: Similar[] }) {
  if (!similar.length) return null;
  return (
    <section className="grid gap-1.5 pt-2">
      <h3 className="px-0.5 text-[13px] font-bold text-muted">
        {w.extra ? `同じグループ（${groupById(w.group)?.title}）の言葉` : `「${w.word}」と意味が近い単語`}
      </h3>
      <div className="panel overflow-hidden">
        {similar.map(({ word: o, shared, near }) => (
          <div key={o.n} className="border-t border-line px-3.5 py-2.5 first:border-t-0">
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <b className="font-word text-[17px] font-black">{o.word}</b>
              <small className="text-xs text-muted">
                {o.kanji && `［${o.kanji}］`}
                {noLabel(o)}
              </small>
              {o.book !== w.book && (
                <span className="rounded bg-ai-soft px-1.5 text-[11px] font-bold text-ai">{BOOKS.find((b) => b.id === o.book)?.name}</span>
              )}
              {shared.length > 0 ? (
                <span className="ml-auto rounded bg-surface-2 px-1.5 text-[11px] text-muted">共通：{shared.slice(0, 2).join("・")}</span>
              ) : (
                near.length > 0 && <span className="ml-auto rounded bg-surface-2 px-1.5 text-[11px] text-muted">近い意味：{near[0]}</span>
              )}
            </div>
            <div className="mt-0.5 text-[13px] leading-relaxed text-ink">
              <InlineMeans w={o} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
