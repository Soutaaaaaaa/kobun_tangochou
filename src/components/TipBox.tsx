import { TIPS } from "@/lib/tips";
import type { Word } from "@/lib/words";

/** 覚え方のコツ（単語カードの裏・クイズで間違えたとき） */
export default function TipBox({ w, className = "" }: { w: Word; className?: string }) {
  const tip = TIPS.get(w.n);
  if (!tip) return null;
  return (
    <aside className={`rounded-xl border-l-4 border-ai bg-ai-soft px-3.5 py-2.5 text-left ${className}`}>
      <p className="mb-1 flex items-center gap-1 text-xs font-bold text-ai">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
        </svg>
        覚え方のコツ
      </p>
      <p className="text-[14px] font-normal leading-relaxed text-ink">{tip}</p>
    </aside>
  );
}
