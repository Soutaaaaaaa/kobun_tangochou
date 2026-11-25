import { WORDS, catOf, shuffle, type Word } from "./words";

/* 意味の重なり判定（重なる語は選択肢にしない＝正解が2つにならない） */
const plainMean = (m: string) => m.replace(/^\[[^\]]+\]/, "").replace(/《[^》]+》/g, "");
function meanTokens(w: Word): Set<string> {
  const set = new Set<string>();
  for (const m of w.means) {
    for (let t of plainMean(m).replace(/（[^）]*）/g, "").split(/[・、,（）「」]/)) {
      t = t.trim().replace(/^〜/, "");
      if (t.length >= 2) set.add(t);
      // 活用違い（甚だしい／甚だしく）も同じ意味として扱う
      if (t.length >= 3 && /[ぁ-ん]$/.test(t)) set.add(t.slice(0, -1) + "*");
    }
  }
  return set;
}
/*
 * 同じ読みの語（きこゆ＝聞こえる／申し上げる など）は、問題では区別できないので
 * 意味をまとめて扱う。きこゆ（聞こえる）の問題に きこえさす（申し上げる）が
 * 誤答として出ると、どちらも正しく見えてしまうため。
 */
const OWN = new Map(WORDS.map((w) => [w.n, meanTokens(w)]));
const TOK = new Map(
  WORDS.map((w) => {
    const set = new Set<string>();
    for (const o of WORDS)
      if (o.word.split("・").some((k) => w.word.split("・").includes(k))) OWN.get(o.n)!.forEach((t) => set.add(t));
    return [w.n, set];
  }),
);
export function conflicts(a: Word, b: Word): boolean {
  const A = TOK.get(a.n)!;
  for (const t of TOK.get(b.n)!) if (A.has(t)) return true;
  return false;
}

/* 紛らわしい語のグループ */
const GROUPS: string[][] = [
  ["ありがたし", "かたし", "かたじけなし"], ["めでたし", "めづらし", "めざまし", "めやすし"], ["あはれなり", "をかし", "いみじ", "ゆゆし"],
  ["いとほし", "うつくし", "らうたし", "かなし"], ["おぼつかなし", "こころもとなし", "うしろめたし", "うしろやすし"], ["ゆかし", "なつかし", "こころにくし"],
  ["すさまじ", "さうざうし", "あいなし"], ["あいなし", "あぢきなし", "あやなし", "よしなし"], ["わびし", "わりなし", "つらし", "こころぐるし"],
  ["やさし", "やすし", "こころやすし"], ["はしたなし", "はかなし", "かたはらいたし"], ["ねたし", "にくし", "こころづきなし", "めざまし"],
  ["つれづれなり", "つれなし"], ["いたし", "いみじ", "あさまし"], ["やがて", "やうやう", "やをら"], ["なかなか", "なほ", "なのめなり"],
  ["おぼろけなり", "なのめなり", "なほざりなり"], ["おほす", "おぼす", "おもほす", "おぼしめす"], ["まかる", "まかづ", "まうづ", "まゐる"],
  ["きこゆ", "きこしめす", "きこえさす"], ["たまふ", "たまはる", "たまはす", "たぶ"], ["たてまつる", "まゐらす", "つかうまつる"],
  ["さぶらふ", "はべり", "おはす", "おはします", "います"], ["あやし", "あさまし", "あやにくなり"], ["としごろ", "ひごろ"],
  ["あした", "つとめて", "つごもり"], ["うつつ", "うつろふ", "うつくし"], ["こころう", "うし", "こころあり", "こころなし"],
  ["おどろく", "おどろおどろし"], ["やむごとなし", "ことごとし", "こよなし"], ["ののしる", "なんず"], ["すずろなり", "すさぶ", "すさまじ"],
  ["あからさまなり", "あらはなり"], ["ことわり", "ことわる"], ["ゆゑ", "よし", "やう"], ["かしこ", "かしこし", "かしこまる"],
  ["あながちなり", "せちなり"], ["おとなし", "おとど", "おと"], ["いとま", "ひま"], ["かたち", "かげ", "さま"],
  ["ながむ", "まもる", "みる"], ["おこたる", "なやむ", "いたはる"], ["ふみ", "ことば", "こと"],
  ["いはけなし", "おほけなし", "いとほし"], ["らうたし", "うるはし", "なまめかし"], ["かしづく", "いたはる"], ["ほいなし", "ほだし"],
];
const keysOf = (w: Word) => w.word.split("・");
const GROUPMAP = new Map<string, Set<number>>();
GROUPS.forEach((g, i) =>
  g.forEach((k) => {
    if (!GROUPMAP.has(k)) GROUPMAP.set(k, new Set());
    GROUPMAP.get(k)!.add(i);
  }),
);
const groupsOf = (w: Word) => {
  const s = new Set<number>();
  keysOf(w).forEach((k) => GROUPMAP.get(k)?.forEach((i) => s.add(i)));
  return s;
};
const posBase = (p: string) => p.replace(/[・／].*$/, "").replace(/^(動|形動|形|副|名|連語|連体|接|代名).*$/, "$1");

function lev(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export type QuizDir = "w2m" | "m2w";

/** 正解 t に対する紛らわしい誤答を3つ選ぶ */
export function distractors(t: Word, dir: QuizDir): Word[] {
  const tg = groupsOf(t);
  const tk = keysOf(t)[0];
  const scored: [number, Word][] = [];
  for (const c of WORDS) {
    if (c.n === t.n || conflicts(t, c)) continue;
    // 同じ読みの別の語（おほす＝命じる／おっしゃる など）は、どちらの形式でも選択肢に出さない
    if (keysOf(c).some((k) => keysOf(t).includes(k))) continue;
    const ck = keysOf(c)[0];
    let s = Math.random() * 2;
    for (const g of groupsOf(c)) if (tg.has(g)) s += 7;
    if (posBase(c.pos) === posBase(t.pos)) s += 2;
    const L = lev(tk, ck);
    if (L <= 1) s += 5;
    else if (L <= 2) s += 3;
    else if (L <= 3) s += 1;
    let p = 0;
    while (p < tk.length && p < ck.length && tk[p] === ck[p]) p++;
    if (p >= 2) s += 2 + (p - 2);
    if (tk.slice(-2) === ck.slice(-2)) s += 1;
    if (catOf(c.n) === catOf(t.n)) s += 0.5;
    scored.push([s, c]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const out: Word[] = [];
  const sameKey = (a: Word, b: Word) => keysOf(a).some((k) => keysOf(b).includes(k));
  for (const c of shuffle(scored.slice(0, 7).map((x) => x[1]))) {
    if (out.every((o) => !conflicts(o, c) && !sameKey(o, c))) out.push(c);
    if (out.length === 3) break;
  }
  for (const [, c] of scored) {
    if (out.length === 3) break;
    if (keysOf(c).some((k) => out.some((o) => keysOf(o).includes(k)))) continue;
    if (!out.includes(c) && out.every((o) => !conflicts(o, c))) out.push(c);
  }
  return out;
}
