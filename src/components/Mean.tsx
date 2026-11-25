import { quizMeans } from "@/lib/quiz-mean";
import { CIRC, splitMean, type Word } from "@/lib/words";

export function MeanText({ m }: { m: string }) {
  const { tag, text } = splitMean(m);
  const parts = text.split(/(《[^》]+》)/);
  return (
    <>
      {tag && (
        <span className="mr-1 inline-block rounded-[3px] border border-current px-1 py-[3px] align-[2px] text-[11px] font-bold leading-none">
          {tag}
        </span>
      )}
      {parts.map((p, i) =>
        p.startsWith("《") ? (
          <span key={i} className="font-normal text-muted">
            {p}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

/** 先頭2つの意味を「／」でつないだ短い表示 */
export function ShortMean({ w }: { w: Word }) {
  return (
    <>
      {w.means.slice(0, 2).map((m, i) => (
        <span key={i}>
          {i > 0 && <span className="font-normal text-muted">／</span>}
          <MeanText m={m} />
        </span>
      ))}
    </>
  );
}

/** ①…②… を1行で */
export function InlineMeans({ w }: { w: Word }) {
  return (
    <>
      {w.means.map((m, i) => (
        <span key={i} className="mr-3 inline">
          {w.means.length > 1 && CIRC[i]}
          <MeanText m={m} />
        </span>
      ))}
    </>
  );
}

/** クイズ用：答えのヒントになる部分を伏せた短い意味 */
export function QuizMean({ w }: { w: Word }) {
  return (
    <>
      {quizMeans(w).map((m, i) => (
        <span key={i}>
          {i > 0 && <span className="font-normal text-muted">／</span>}
          <MeanText m={m} />
        </span>
      ))}
    </>
  );
}
