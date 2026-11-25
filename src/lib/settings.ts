"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 端末ごとの表示設定（このブラウザの localStorage に保存）。
 * 保存できない環境（プライベートモードなど）では既定値で動く。
 */
export type Settings = { showTips: boolean };
const DEFAULTS: Settings = { showTips: true };
const KEY = "kobun-settings";

let cache: Settings | null = null;
const listeners = new Set<() => void>();

function read(): Settings {
  if (cache) return cache;
  try {
    cache = { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
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
