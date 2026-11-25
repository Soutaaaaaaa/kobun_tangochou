import type { QuizFormat } from "@/components/Quiz";
import { rangesToString, type BookId, type Range } from "./words";

export type StudyParams = {
  mode: "cards" | "quiz";
  ranges?: Range[];
  ids?: number[];
  /** 出題数（0 = すべて） */
  count?: number;
  order?: "seq" | "random";
  weakOnly?: boolean;
  notKnownOnly?: boolean;
  /** 間違えやすい語を少し出やすくする（画面には出さない） */
  weighted?: boolean;
  format?: QuizFormat;
  title: string;
  /** 単語帳（範囲 r の番号はこの単語帳の見出し語番号） */
  book?: BookId;
  /** 関連語も出す（古文単語315） */
  includeRelated?: boolean;
};

export function studyHref(p: StudyParams): string {
  const q = new URLSearchParams();
  q.set("mode", p.mode);
  if (p.ranges?.length) q.set("r", rangesToString(p.ranges));
  if (p.ids?.length) q.set("ids", p.ids.join(","));
  if (p.count) q.set("n", String(p.count));
  q.set("order", p.order ?? "random");
  if (p.weakOnly) q.set("weak", "1");
  if (p.notKnownOnly) q.set("nk", "1");
  if (p.weighted) q.set("w", "1");
  if (p.mode === "quiz") q.set("q", p.format ?? "mix");
  q.set("t", p.title);
  if (p.book && p.book !== "kobun400") q.set("b", p.book);
  if (p.includeRelated) q.set("rel", "1");
  return `/study?${q.toString()}`;
}
