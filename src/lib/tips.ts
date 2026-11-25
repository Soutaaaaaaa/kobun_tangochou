import { TIPS_RAW } from "./tips-raw";
import { TIPS315_RAW } from "./tips315-raw";
import { id315OfNo } from "./words";

const parse = (raw: string, id: (no: string) => number) =>
  raw
    .trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("|");
      return [id(l.slice(0, i)), l.slice(i + 1)] as const;
    });

/** 単語の n → 覚え方のコツ（古文単語400・古文単語315 の見出し語） */
export const TIPS = new Map<number, string>([...parse(TIPS_RAW, Number), ...parse(TIPS315_RAW, id315OfNo)]);
