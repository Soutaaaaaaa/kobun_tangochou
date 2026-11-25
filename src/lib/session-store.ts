"use client";

import type { QuizDir } from "./distractors";

/**
 * 中断した単語カード・クイズの続き（この端末の localStorage に保存）。
 * 1問答えるごとに自動で保存し、最後まで終わったら消す。
 */
type Base = { title: string; href: string; at: number; i: number; total: number };
export type CardSave = Base & { kind: "cards"; words: number[]; ok: number[]; ng: number[] };
export type QuizSave = Base & {
  kind: "quiz";
  items: { n: number; reason?: string; k?: "priority" | "normal" }[];
  dirs: QuizDir[];
  score: number;
  missed: number[];
};
export type Saved = CardSave | QuizSave;

const PREFIX = "kobun-session:";
const MAX_AGE = 14 * 24 * 3600 * 1000;

export function loadSession(key: string): Saved | null {
  try {
    const s = JSON.parse(localStorage.getItem(PREFIX + key) || "null") as Saved | null;
    if (!s || Date.now() - s.at > MAX_AGE || s.i <= 0 || s.i >= s.total) return null;
    return s;
  } catch {
    return null;
  }
}

export function saveSession(key: string, s: Omit<CardSave, "at"> | Omit<QuizSave, "at">) {
  try {
    if (s.i >= s.total) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify({ ...s, at: Date.now() }));
  } catch {}
}

export function clearSession(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
}

/** 中断中の学習の一覧（新しい順） */
export function listSessions(): (Saved & { key: string })[] {
  const out: (Saved & { key: string })[] = [];
  try {
    const names: string[] = [];
    for (let k = 0; k < localStorage.length; k++) names.push(localStorage.key(k) ?? "");
    for (const name of names) {
      if (!name.startsWith(PREFIX)) continue;
      const key = name.slice(PREFIX.length);
      const s = loadSession(key);
      if (s) out.push({ ...s, key });
      else localStorage.removeItem(name);
    }
  } catch {}
  return out.sort((a, b) => b.at - a.at);
}
