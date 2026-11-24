"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProgressMap, StudyMode, WordProgress } from "@/lib/progress";

type Ctx = {
  username: string;
  progress: ProgressMap;
  loading: boolean;
  error: string | null;
  record: (wordNo: number, correct: boolean, mode: StudyMode) => void;
  setWeak: (wordNo: number, weak: boolean) => void;
};

const ProgressContext = createContext<Ctx | null>(null);

export const useProgress = () => {
  const c = useContext(ProgressContext);
  if (!c) throw new Error("useProgress must be used inside ProgressProvider");
  return c;
};

const COLS =
  "word_no,is_weak,last_result,correct_count,wrong_count,streak,first_studied_at,last_studied_at,last_correct_at,last_wrong_at";

const empty = (n: number): WordProgress => ({
  word_no: n, is_weak: false, last_result: null, correct_count: 0, wrong_count: 0, streak: 0,
  first_studied_at: null, last_studied_at: null, last_correct_at: null, last_wrong_at: null,
});

/** サーバーの record_answer と同じ規則で、画面をすぐ更新する */
function applyLocal(p: WordProgress, correct: boolean, mode: StudyMode): WordProgress {
  const now = new Date().toISOString();
  const streak = correct ? p.streak + 1 : 0;
  return {
    ...p,
    is_weak: !correct ? true : mode === "card" ? false : streak >= 2 ? false : p.is_weak,
    last_result: correct,
    correct_count: p.correct_count + (correct ? 1 : 0),
    wrong_count: p.wrong_count + (correct ? 0 : 1),
    streak,
    first_studied_at: p.first_studied_at ?? now,
    last_studied_at: now,
    last_correct_at: correct ? now : p.last_correct_at,
    last_wrong_at: correct ? p.last_wrong_at : now,
  };
}

export default function ProgressProvider({ username, children }: { username: string; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [progress, setProgress] = useState<ProgressMap>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from("word_progress")
      .select(COLS)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error)
          setError(
            `学習記録を読み込めませんでした。通信状況を確認して、ページを再読み込みしてください。（詳細: ${error.code ?? ""} ${error.message}）`,
          );
        else setProgress(new Map((data as WordProgress[]).map((r) => [r.word_no, r])));
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [supabase]);

  const put = useCallback((row: WordProgress) => {
    setProgress((prev) => new Map(prev).set(row.word_no, row));
  }, []);

  const record = useCallback(
    (wordNo: number, correct: boolean, mode: StudyMode) => {
      setProgress((prev) => new Map(prev).set(wordNo, applyLocal(prev.get(wordNo) ?? empty(wordNo), correct, mode)));
      supabase
        .rpc("record_answer", { p_word_no: wordNo, p_correct: correct, p_mode: mode })
        .then(({ data, error }) => {
          if (error) setError(`学習記録を保存できませんでした。通信状況を確認してください。（詳細: ${error.code ?? ""} ${error.message}）`);
          else if (data) put(data as WordProgress);
        });
    },
    [supabase, put],
  );

  const setWeak = useCallback(
    (wordNo: number, weak: boolean) => {
      setProgress((prev) => new Map(prev).set(wordNo, { ...(prev.get(wordNo) ?? empty(wordNo)), is_weak: weak, streak: 0 }));
      supabase.rpc("set_weak", { p_word_no: wordNo, p_weak: weak }).then(({ data, error }) => {
        if (error) setError(`苦手リストを保存できませんでした。通信状況を確認してください。（詳細: ${error.code ?? ""} ${error.message}）`);
        else if (data) put(data as WordProgress);
      });
    },
    [supabase, put],
  );

  const value = useMemo(
    () => ({ username, progress, loading, error, record, setWeak }),
    [username, progress, loading, error, record, setWeak],
  );

  return (
    <ProgressContext.Provider value={value}>
      {error && (
        <div role="alert" className="sticky top-0 z-20 bg-shu px-4 py-2 text-center text-sm font-medium text-surface">
          {error}
          <button className="ml-3 underline" onClick={() => setError(null)}>
            閉じる
          </button>
        </div>
      )}
      {children}
    </ProgressContext.Provider>
  );
}
