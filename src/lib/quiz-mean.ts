import type { Word } from "./words";

/**
 * クイズで意味を見せるときに、答えのヒントになってしまう部分を伏せる。
 * - 「うちいづ」「いみじく」「例の」のように、見出し語そのもの（活用形・漢字）を含むカギかっこ → 「〜」
 * - 《さて・副詞》のように見出し語を含む小見出し → 削除
 * - [甚] [忍] [左右無し] のような漢字の小見出し → 削除（敬語の [尊・本] などは残す）
 * 単語カードや一覧では元の表記のまま。
 */

const KEIGO_TAG = /^(尊|謙|丁)・(本|補)$|^補$/;

function stemsOf(w: Word): string[] {
  const out = new Set<string>();
  for (const k of w.word.split("・")) {
    out.add(k);
    if (k.endsWith("なり") && k.length > 3) out.add(k.slice(0, -2));
    if (k.length >= 3) out.add(k.slice(0, -1));
  }
  for (const k of w.kanji.split(/[・／]/)) if (k) out.add(k.replace(/[ぁ-ん]+$/, "") || k);
  return [...out].filter((s) => s.length >= 1);
}

const keysOf = (w: Word) => w.word.split("・");

export function hasGiveaway(w: Word, m: string): boolean {
  const tag = m.match(/^\[([^\]]+)\]/)?.[1];
  if (tag && !KEIGO_TAG.test(tag)) return true;
  const stems = stemsOf(w);
  if ([...m.matchAll(/「([^」]*)」/g)].some(([, q]) => stems.some((s) => q.includes(s)))) return true;
  if ([...m.matchAll(/《([^》]*)》/g)].some(([, q]) => keysOf(w).some((k) => q.includes(k)))) return true;
  return false;
}

export function maskMean(w: Word, m: string): string {
  const stems = stemsOf(w);
  let s = m.replace(/^\[([^\]]+)\]/, (all, tag: string) => (KEIGO_TAG.test(tag) ? all : ""));
  s = s.replace(/「([^」]*)」/g, (all, q: string) => (stems.some((st) => q.includes(st)) ? "「〜」" : all));
  s = s.replace(/《([^》]*)》/g, (all, q: string) => (keysOf(w).some((k) => q.includes(k)) ? "" : all));
  return s;
}

/** 訳語そのものが見出し語に似ている（かこつ→かこつける、まねぶ→まねる、わざと→わざわざ） */
function looksLikeWord(w: Word, m: string): boolean {
  const plain = m.replace(/「[^」]*」/g, "");
  return keysOf(w).some((k) => k.length >= 3 && plain.includes(k.slice(0, -1)));
}

/**
 * クイズ用の意味（最大2つ）。
 * ヒントにならない意味だけで足りればそれを使い、足りないときだけ伏せ字にした意味で補う。
 */
export function quizMeans(w: Word, max = 2): string[] {
  const idx = w.means.map((_, i) => i);
  const bad = (i: number) => hasGiveaway(w, w.means[i]) || looksLikeWord(w, w.means[i]);
  const clean = idx.filter((i) => !bad(i));
  const rest = idx.filter((i) => bad(i));
  return (clean.length ? clean : rest)
    .slice(0, max)
    .sort((a, b) => a - b)
    .map((i) => maskMean(w, w.means[i]));
}
