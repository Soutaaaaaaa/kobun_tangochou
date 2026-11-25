import { WORDS_RAW } from "./words-raw";
import { WORDS315_RAW } from "./words315-raw";

export type BookId = "kobun400" | "kobun315";
/** 関連語の種類（索引のマーク）：関＝関連語・同＝同義語・反＝反対語・類＝類義語 */
export type RelKind = "関" | "同" | "反" | "類";

export type Word = {
  /** アプリ全体で一意の番号（学習記録のキー）。古文単語400 は 1–400、古文単語315 は 10000 + 番号×10 + 関連語の順（a=1, b=2…） */
  n: number;
  /** 画面に出す番号（"94"、関連語は "94.a"） */
  no: string;
  book: BookId;
  /** 単語帳の中での見出し語番号（関連語は親の番号） */
  head: number;
  /** 関連語のときだけ：種類と親の n */
  rel?: RelKind;
  parent?: number;
  word: string;
  kanji: string;
  pos: string;
  means: string[];
};

export type Category = { id: number; name: string; from: number; to: number; color: string; book: BookId };
export type Section = { id: string; num: number; book: BookId; cat: Category; from: number; to: number };

/* ---------- 古文単語400 ---------- */
export const WORDS400: Word[] = WORDS_RAW.trim()
  .split("\n")
  .map((line) => {
    const [n, word, kanji, pos, m] = line.split("|");
    return { n: Number(n), no: n, book: "kobun400", head: Number(n), word, kanji, pos, means: m.split(";") };
  });

/* ---------- 古文単語315 ---------- */
export const ID315 = (head: number, k = 0) => 10000 + head * 10 + k;
/** "94" → 見出し語、"94.a" → 関連語 a の n */
export const id315OfNo = (no: string) => {
  const [h, letter] = no.split(".");
  return ID315(Number(h), letter ? letter.charCodeAt(0) - 96 : 0);
};
const RELS: RelKind[] = ["関", "同", "反", "類"];
export const WORDS315: Word[] = WORDS315_RAW.trim()
  .split("\n")
  .map((line) => {
    const [no, mark, word, kanji, pos, m] = line.split("|");
    const head = Number(no.split(".")[0]);
    const rel = RELS.find((r) => r === mark);
    return {
      n: id315OfNo(no),
      // 「分」＝同じ番号のもう一つの見出し語（なやむ・まうづ など）。番号は見出し語と同じに見せる
      no: mark === "分" ? String(head) : no,
      book: "kobun315",
      head,
      ...(rel ? { rel, parent: ID315(head) } : {}),
      word,
      kanji,
      pos,
      means: m.split(";"),
    } as Word;
  });

/** 互換用：古文単語400 の単語 */
export const WORDS = WORDS400;
export const ALL_WORDS: Word[] = [...WORDS400, ...WORDS315];
export const BOOK_WORDS: Record<BookId, Word[]> = { kobun400: WORDS400, kobun315: WORDS315 };
export const BYNUM = new Map(ALL_WORDS.map((w) => [w.n, w]));
export const isBookId = (s: string | null | undefined): s is BookId => s === "kobun400" || s === "kobun315";
export const BOOK_SIZE: Record<BookId, number> = { kobun400: 400, kobun315: 315 };

export const CATS: Category[] = [
  { id: 1, name: "最頻出語", from: 1, to: 100, color: "var(--c1)", book: "kobun400" },
  { id: 2, name: "頻出語", from: 101, to: 240, color: "var(--c2)", book: "kobun400" },
  { id: 3, name: "敬語", from: 241, to: 275, color: "var(--c3)", book: "kobun400" },
  { id: 4, name: "重要語", from: 276, to: 400, color: "var(--c4)", book: "kobun400" },
  { id: 5, name: "古文単語315", from: 1, to: 315, color: "var(--c5)", book: "kobun315" },
];
export const bookCats = (b: BookId) => CATS.filter((c) => c.book === b);

/** 約20語ずつ（関連語は数えない）。端数はカテゴリ最後のセクションに含め、カテゴリをまたがない。 */
export const SECTIONS: Section[] = (() => {
  const out: Section[] = [];
  for (const b of ["kobun400", "kobun315"] as BookId[]) {
    let num = 0;
    for (const c of bookCats(b)) {
      const total = c.to - c.from + 1;
      const k = Math.floor(total / 20);
      const r = total - k * 20;
      const sizes = Array<number>(k).fill(20);
      if (r >= 10) sizes.push(r);
      else if (r > 0) sizes[sizes.length - 1] += r;
      let start = c.from;
      for (const sz of sizes) {
        num++;
        // 古文単語400 は従来どおり "1"〜"20"、古文単語315 は "315-1"〜
        out.push({ id: b === "kobun400" ? String(num) : `315-${num}`, num, book: b, cat: c, from: start, to: start + sz - 1 });
        start += sz;
      }
    }
  }
  return out;
})();
export const bookSections = (b: BookId) => SECTIONS.filter((s) => s.book === b);
export const sectionById = (id: string) => SECTIONS.find((s) => s.id === id);

export const catOf = (n: number): Category => {
  const w = BYNUM.get(n);
  if (w?.book === "kobun315") return CATS[4];
  return CATS.find((c) => c.book === "kobun400" && n >= c.from && n <= c.to) ?? CATS[0];
};
/** 見出し語番号が範囲内の語（関連語は includeRelated のときだけ、親のすぐ後ろに並ぶ） */
export const sectionWords = (s: Pick<Section, "from" | "to"> & { book?: BookId }, includeRelated = false) =>
  BOOK_WORDS[s.book ?? "kobun400"].filter((w) => w.head >= s.from && w.head <= s.to && (includeRelated || !w.rel));
export const headwords = (b: BookId) => BOOK_WORDS[b].filter((w) => !w.rel);

/* ---------- 範囲の文字列 "1-20,41-60" ---------- */
export type Range = [number, number];

export function parseRanges(s: string | null | undefined, max = 400): Range[] {
  if (!s) return [];
  const out: Range[] = [];
  for (const part of s.split(",")) {
    const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
    if (!m) continue;
    let a = Number(m[1]);
    let b = m[2] ? Number(m[2]) : a;
    if (a > b) [a, b] = [b, a];
    a = Math.max(1, a);
    b = Math.min(max, b);
    if (a <= b) out.push([a, b]);
  }
  return out;
}

export const rangesToString = (rs: Range[]) => rs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(",");

export const wordsInRanges = (rs: Range[], book: BookId = "kobun400", includeRelated = false) =>
  BOOK_WORDS[book].filter((w) => (includeRelated || !w.rel) && rs.some(([a, b]) => w.head >= a && w.head <= b));

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
const posHead = (p: string) => p.replace(/^敬/, "").replace(/[・／].*$/, "");
const isKeigo = (x: Word) => catOf(x.n).id === 3 || x.pos.startsWith("敬");
export function homographHint(w: Word): string | null {
  const twins = BOOK_WORDS[w.book].filter((o) => o.n !== w.n && keyList(o).some((k) => keyList(w).includes(k)));
  if (!twins.length || twins.every((o) => posHead(o.pos) !== posHead(w.pos))) return null;
  if (twins.some((o) => isKeigo(o) !== isKeigo(w))) return isKeigo(w) ? "敬語" : "敬語以外";
  return `No.${w.no}`;
}

/** 関連語の種類の表示名 */
export const REL_LABEL: Record<RelKind, string> = { 関: "関連語", 同: "同義語", 反: "反対語", 類: "類義語" };
