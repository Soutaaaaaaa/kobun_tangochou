import { OWN } from "./distractors";
import { WORDS, type Word } from "./words";

/**
 * 似た意味の単語。
 * 訳語（「・」や「、」で区切った語句）が一致するものを優先し、
 * 書き出し3文字が同じ訳語（かわいい／かわいらしい など）も少し加点する。
 * 同じ読みの別の語（きこゆ No.14 と No.260 など）は意味が違うので除く。
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

export function similarWords(w: Word, max = 5): { word: Word; shared: string[] }[] {
  if (CACHE.has(w.n)) return CACHE.get(w.n)!;
  const out = WORDS.filter((o) => o.n !== w.n && !keys(o).some((k) => keys(w).includes(k)))
    .map((o) => ({ word: o, ...score(w, o) }))
    .filter((x) => x.s >= 1)
    .sort((a, b) => b.s - a.s || Math.abs(a.word.n - w.n) - Math.abs(b.word.n - w.n))
    .slice(0, max)
    .map(({ word, shared }) => ({ word, shared }));
  CACHE.set(w.n, out);
  return out;
}
