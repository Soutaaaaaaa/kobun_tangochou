import { OWN } from "./distractors";
import { ALL_WORDS, BOOK_WORDS, type Word } from "./words";

/**
 * 似た意味の単語。
 * 訳語（「・」や「、」で区切った語句）が一致するものを優先し、
 * 書き出し3文字が同じ訳語（かわいい／かわいらしい など）も少し加点する。
 * 同じ読みの別の語（きこゆ No.14 と No.260 など）は意味が違うので除く。
 * もう一つの単語帳の語も候補にする（同じ語そのものは除く）。同点なら今の単語帳の語を先に出す。
 */
const keys = (w: Word) => w.word.split("・");
const plain = (t: string) => t.replace(/\*$/, "");

function score(a: Word, b: Word): { s: number; shared: string[] } {
  const A = OWN.get(a.n)!;
  const B = OWN.get(b.n)!;
  const shared = new Set<string>();
  let s = 0;
  for (const t of A) {
    if (t.endsWith("*")) continue;
    if (B.has(t)) {
      s += 3;
      shared.add(t);
    }
  }
  // 活用違い（甚だしい／甚だしく）
  for (const t of A)
    if (t.endsWith("*") && B.has(t) && ![...shared].some((x) => x.startsWith(plain(t)))) {
      s += 2;
      shared.add(plain(t) + "…");
    }
  // 語形が少し違うだけの訳語（かわいい／かわいらしい）
  if (s === 0) {
    for (const t of A)
      for (const u of B) {
        if (t.endsWith("*") || u.endsWith("*")) continue;
        const [sh, lo] = t.length <= u.length ? [t, u] : [u, t];
        if (sh.length >= 4 && lo !== sh && lo.length <= sh.length + 2 && lo.startsWith(sh.slice(0, -1))) {
          s = 1.5;
          shared.add(sh);
        }
      }
  }
  return { s, shared: [...shared] };
}

const CACHE = new Map<number, { word: Word; shared: string[] }[]>();

export function similarWords(w: Word, max = 6): { word: Word; shared: string[] }[] {
  if (CACHE.has(w.n)) return CACHE.get(w.n)!;
  // おまけは同じグループの言葉を出す
  if (w.extra) {
    const out = BOOK_WORDS[w.book].filter((o) => o.group === w.group && o.n !== w.n).slice(0, 8).map((o) => ({ word: o, shared: [] }));
    CACHE.set(w.n, out);
    return out;
  }
  const dist = (o: Word) => (o.book === w.book ? Math.abs(o.n - w.n) : 1e6);
  const out = ALL_WORDS.filter((o) => !o.extra && o.n !== w.n && !keys(o).some((k) => keys(w).includes(k)))
    .map((o) => ({ word: o, ...score(w, o) }))
    .filter((x) => x.s >= 1)
    .sort((a, b) => b.s - a.s || dist(a.word) - dist(b.word))
    // 両方の単語帳にある語（いたし など）は一つだけ出す
    .filter((x, i, a) => a.findIndex((y) => keys(y.word).some((k) => keys(x.word).includes(k))) === i)
    .slice(0, max)
    .map(({ word, shared }) => ({ word, shared }));
  CACHE.set(w.n, out);
  return out;
}
