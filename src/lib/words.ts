import { WORDS_RAW } from "./words-raw";

export type Word = {
  n: number;
  word: string;
  kanji: string;
  pos: string;
  means: string[];
};

export type Category = { id: number; name: string; from: number; to: number; color: string };
export type Section = { id: number; cat: Category; from: number; to: number };

export const WORDS: Word[] = WORDS_RAW.trim()
  .split("\n")
  .map((line) => {
    const [n, word, kanji, pos, m] = line.split("|");
    return { n: Number(n), word, kanji, pos, means: m.split(";") };
  });

export const BYNUM = new Map(WORDS.map((w) => [w.n, w]));

export const CATS: Category[] = [
  { id: 1, name: "最頻出語", from: 1, to: 100, color: "var(--c1)" },
  { id: 2, name: "頻出語", from: 101, to: 240, color: "var(--c2)" },
  { id: 3, name: "敬語", from: 241, to: 275, color: "var(--c3)" },
  { id: 4, name: "重要語", from: 276, to: 400, color: "var(--c4)" },
];

/** 約20語ずつ。端数はカテゴリ最後のセクションに含め、カテゴリをまたがない。 */
export const SECTIONS: Section[] = (() => {
  const out: Section[] = [];
  for (const c of CATS) {
    const total = c.to - c.from + 1;
    const k = Math.floor(total / 20);
    const r = total - k * 20;
    const sizes = Array<number>(k).fill(20);
    if (r >= 10) sizes.push(r);
    else if (r > 0) sizes[sizes.length - 1] += r;
    let start = c.from;
    for (const s of sizes) {
      out.push({ id: out.length + 1, cat: c, from: start, to: start + s - 1 });
      start += s;
    }
  }
  return out;
})();

export const catOf = (n: number): Category => CATS.find((c) => n >= c.from && n <= c.to)!;
export const sectionWords = (s: Pick<Section, "from" | "to">) => WORDS.filter((w) => w.n >= s.from && w.n <= s.to);

/* ---------- 範囲の文字列 "1-20,41-60" ---------- */
export type Range = [number, number];

export function parseRanges(s: string | null | undefined): Range[] {
  if (!s) return [];
  const out: Range[] = [];
  for (const part of s.split(",")) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    let a = Number(m[1]);
    let b = m[2] ? Number(m[2]) : a;
    if (a > b) [a, b] = [b, a];
    a = Math.max(1, a);
    b = Math.min(400, b);
    if (a <= b) out.push([a, b]);
  }
  return out;
}

export const rangesToString = (rs: Range[]) => rs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(",");

export const wordsInRanges = (rs: Range[]) => WORDS.filter((w) => rs.some(([a, b]) => w.n >= a && w.n <= b));

/* ---------- 表示用 ---------- */
export const CIRC = "①②③④⑤⑥⑦⑧";

export type MeanPart = { tag?: string; text: string };
/** "[尊・本]お思いになる" → { tag: "尊・本", text: "お思いになる" } */
export function splitMean(m: string): MeanPart {
  const mm = m.match(/^\[([^\]]+)\](.*)$/);
  return mm ? { tag: mm[1], text: mm[2] } : { text: m };
}

export function shuffle<T>(a: readonly T[]): T[] {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * 漢字を伏せると同じ見た目になる語（きこゆ・おほす・まかる・よし・しるし）を見分けるための添え書き。
 * 品詞が違えば品詞で見分けられるので null、品詞まで同じなら「敬語」「敬語以外」。
 */
const keyList = (w: Word) => w.word.split("・");
const posHead = (p: string) => p.replace(/[・／].*$/, "");
export function homographHint(w: Word): string | null {
  const twins = WORDS.filter((o) => o.n !== w.n && keyList(o).some((k) => keyList(w).includes(k)));
  if (!twins.length || twins.every((o) => posHead(o.pos) !== posHead(w.pos))) return null;
  const keigo = (x: Word) => catOf(x.n).id === 3;
  if (twins.some((o) => keigo(o) !== keigo(w))) return keigo(w) ? "敬語" : "敬語以外";
  return `No.${w.n}`;
}
