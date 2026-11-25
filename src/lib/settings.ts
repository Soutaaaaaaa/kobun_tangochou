"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 端末ごとの表示設定（このブラウザの localStorage に保存）。
 * 保存できない環境（プライベートモードなど）では既定値で動く。
 */
export type Settings = {
  /** 覚え方のコツを表示する */
  showTips: boolean;
  /** 中断した学習を開いたとき：ask＝毎回たずねる、resume＝自動で続きから、fresh＝いつも最初から */
  resumeMode: ResumeMode;
};
export type ResumeMode = "ask" | "resume" | "fresh";
const DEFAULTS: Settings = { showTips: true, resumeMode: "ask" };
const KEY = "kobun-settings";

let cache: Settings | null = null;
const listeners = new Set<() => void>();

function read(): Settings {
  if (cache) return cache;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    // 以前の「確認する オン／オフ」の設定を引き継ぐ
    if (raw.resumeMode === undefined && raw.askResume === false) raw.resumeMode = "resume";
    delete raw.askResume;
    cache = { ...DEFAULTS, ...raw };
  } catch {
    cache = DEFAULTS;
  }
  return cache!;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      fn();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

/** フックの外（useEffect の中など）で今の設定を読む */
export const getSettings = (): Settings => read();

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const s = useSyncExternalStore(subscribe, read, () => DEFAULTS);
  const set = useCallback((patch: Partial<Settings>) => {
    cache = { ...read(), ...patch };
    try {
      localStorage.setItem(KEY, JSON.stringify(cache));
    } catch {}
    listeners.forEach((l) => l());
  }, []);
  return [s, set];
}
