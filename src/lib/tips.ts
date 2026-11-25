import { TIPS_RAW } from "./tips-raw";

/** 単語番号 → 覚え方のコツ */
export const TIPS = new Map<number, string>(
  TIPS_RAW.trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("|");
      return [Number(l.slice(0, i)), l.slice(i + 1)] as const;
    }),
);
