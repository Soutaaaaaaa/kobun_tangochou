"use client";

import { useId } from "react";
import { flameSize } from "@/lib/streak";

type Props = {
  streak: number;
  /** 今日すでに学習したか（まだなら色を落とす） */
  lit: boolean;
  base?: number;
  max?: number;
  className?: string;
};

/** 連続日数の数字を重ねたほのお。日数が増えるほど大きく、炎の層も増える */
export default function Flame({ streak, lit, base = 56, max = 132, className = "" }: Props) {
  const size = flameSize(streak, base, max);
  const uid = useId().replace(/:/g, "");
  const outer = `flame-outer-${uid}`;
  const inner = `flame-inner-${uid}`;
  const strong = streak >= 7;
  const blaze = streak >= 30;
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size * 1.15 }}
      role="img"
      aria-label={`${streak}日連続${lit ? "" : "（今日はまだ）"}`}
    >
      <svg viewBox="0 0 100 115" className={`absolute inset-0 h-full w-full ${lit ? "flame-flicker" : ""}`} aria-hidden>
        <defs>
          <linearGradient id={outer} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? "var(--flame-1)" : "var(--flame-off-1)"} />
            <stop offset="1" stopColor={lit ? "var(--flame-2)" : "var(--flame-off-2)"} />
          </linearGradient>
          <linearGradient id={inner} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor={lit ? "var(--flame-3)" : "var(--flame-off-2)"} />
            <stop offset="1" stopColor={lit ? "var(--flame-4)" : "var(--flame-off-3)"} />
          </linearGradient>
        </defs>
        {blaze && lit && (
          <path
            d="M50 2C58 22 84 34 86 66c2 28-16 47-36 47S12 96 14 68c1-18 12-26 16-40 4 10 10 14 14 14C42 28 44 14 50 2Z"
            fill="var(--flame-1)"
            opacity="0.35"
            transform="translate(50 60) scale(1.12) translate(-50 -60)"
          />
        )}
        <path
          d="M50 4C57 22 82 35 84 66c2 27-15 45-34 45S15 94 17 68c1-17 11-25 15-38 4 10 9 13 13 13C43 29 45 16 50 4Z"
          fill={`url(#${outer})`}
        />
        {(strong || !lit) && (
          <path d="M50 40c5 12 20 20 20 38 0 15-9 25-20 25S30 93 30 79c0-9 5-14 8-21 3 6 6 8 9 8-1-9 0-17 3-26Z" fill={`url(#${inner})`} />
        )}
        {!strong && lit && (
          <path d="M50 52c4 9 16 16 16 30 0 12-7 20-16 20S34 94 34 83c0-7 4-11 6-16 2 5 5 6 7 6-1-7 0-14 3-21Z" fill={`url(#${inner})`} />
        )}
      </svg>
      <span
        className="absolute inset-x-0 bottom-[14%] text-center font-word font-black leading-none tabular-nums"
        style={{
          fontSize: size * (streak >= 100 ? 0.3 : 0.38),
          color: lit ? "#fff" : "var(--surface)",
          textShadow: lit ? "0 1px 0 rgba(120,30,0,.55), 0 0 6px rgba(120,30,0,.35)" : "none",
        }}
      >
        {streak}
      </span>
    </div>
  );
}
