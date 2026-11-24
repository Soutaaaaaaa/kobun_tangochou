"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import { InlineMeans } from "@/components/Mean";
import { createClient } from "@/lib/supabase/client";
import { ago, fmtDateTime, isKnown, type WordProgress } from "@/lib/progress";
import { BYNUM, CATS, WORDS } from "@/lib/words";

type Log = { id: number; word_no: number; correct: boolean; mode: string; created_at: string };
type Profile = { username: string; is_admin: boolean; created_at: string };
const MODE_LABEL: Record<string, string> = { card: "カード", quiz: "クイズ", review: "今日の復習" };

export default function AdminUserPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [rows, setRows] = useState<WordProgress[] | null>(null);
  const [logs, setLogs] = useState<Log[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = createClient();
    Promise.all([
      sb.from("profiles").select("username,is_admin,created_at").eq("id", id).maybeSingle(),
      sb.from("word_progress").select("*").eq("user_id", id),
      sb.from("study_logs").select("id,word_no,correct,mode,created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    ]).then(([p, w, l]) => {
      const err = p.error ?? w.error ?? l.error;
      if (err) return setError(`読み込めませんでした（${err.message}）`);
      if (!p.data) return setError("このアカウントは見つかりません。");
      setProfile(p.data as Profile);
      setRows((w.data as WordProgress[]) ?? []);
      setLogs((l.data as Log[]) ?? []);
    });
  }, [id]);

  const map = useMemo(() => new Map((rows ?? []).map((r) => [r.word_no, r])), [rows]);
  const weak = useMemo(
    () => (rows ?? []).filter((r) => r.is_weak).sort((a, b) => (b.last_wrong_at ?? "").localeCompare(a.last_wrong_at ?? "")),
    [rows],
  );
  const mostMissed = useMemo(
    () => (rows ?? []).filter((r) => r.wrong_count > 0).sort((a, b) => b.wrong_count - a.wrong_count).slice(0, 10),
    [rows],
  );
  const known = WORDS.filter((w) => isKnown(map.get(w.n))).length;
  const studied = (rows ?? []).filter((r) => r.last_studied_at).length;
  const lastStudied = (rows ?? []).reduce<string | null>((a, r) => (r.last_studied_at && (!a || r.last_studied_at > a) ? r.last_studied_at : a), null);

  return (
    <>
      <AppBar title={profile ? `管理：${profile.username}` : "管理"} back="/admin" />
      <Page>
        {error ? (
          <p className="panel p-4 text-sm text-shu">{error}</p>
        ) : !profile || !rows || !logs ? (
          <p className="py-16 text-center text-muted">読み込み中…</p>
        ) : (
          <>
            <section className="panel grid gap-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-word text-2xl font-black">
                  {profile.username}
                  {profile.is_admin && <span className="ml-1.5 rounded bg-ai-soft px-1.5 py-0.5 font-body text-[11px] font-bold text-ai">管理者</span>}
                </p>
                <span className="text-xs text-muted">登録 {fmtDateTime(profile.created_at)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["覚えた", known],
                  ["学習済", studied],
                  ["苦手", weak.length],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-surface-2 py-2">
                    <p className="font-word text-2xl font-black tabular-nums">{v}</p>
                    <p className="text-xs text-muted">{l}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">最終学習 {fmtDateTime(lastStudied)}（{ago(lastStudied)}）</p>
              <div className="grid gap-2">
                {CATS.map((c) => {
                  const cw = WORDS.filter((w) => w.n >= c.from && w.n <= c.to);
                  const k = cw.filter((w) => isKnown(map.get(w.n))).length;
                  return (
                    <div key={c.id} className="grid grid-cols-[5em_1fr_auto] items-center gap-2 text-xs">
                      <span style={{ color: c.color }} className="font-bold">
                        {c.name}
                      </span>
                      <span className="meter h-[6px]">
                        <i style={{ width: `${(k / cw.length) * 100}%` }} />
                      </span>
                      <span className="tabular-nums text-muted">
                        {k}/{cw.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <h2 className="-mb-2 px-0.5 text-[13px] text-muted">苦手リスト（{weak.length}語）</h2>
            <div className="panel overflow-hidden">
              {weak.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">なし</p>
              ) : (
                weak.map((r) => {
                  const w = BYNUM.get(r.word_no)!;
                  return (
                    <div key={r.word_no} className="border-t border-line px-3.5 py-2.5 first:border-t-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs tabular-nums text-muted">{w.n}</span>
                        <b className="font-word text-[17px] font-black">{w.word}</b>
                      </div>
                      <div className="text-[13px] text-muted">
                        <InlineMeans w={w} />
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] tabular-nums text-muted">
                        <span className="text-shu">最後に間違えた {ago(r.last_wrong_at)}</span>
                        <span>最終学習 {ago(r.last_studied_at)}</span>
                        <span>
                          正解 {r.correct_count}・不正解 {r.wrong_count}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <h2 className="-mb-2 px-0.5 text-[13px] text-muted">よく間違える単語</h2>
            <div className="panel overflow-hidden">
              {mostMissed.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">なし</p>
              ) : (
                mostMissed.map((r) => (
                  <div key={r.word_no} className="flex items-baseline gap-3 border-t border-line px-3.5 py-2 text-sm first:border-t-0">
                    <span className="w-[3ch] text-xs tabular-nums text-muted">{r.word_no}</span>
                    <b className="min-w-0 flex-1 truncate font-word">{BYNUM.get(r.word_no)?.word}</b>
                    <span className="text-xs tabular-nums text-shu">不正解 {r.wrong_count}</span>
                    <span className="text-xs tabular-nums text-muted">正解 {r.correct_count}</span>
                  </div>
                ))
              )}
            </div>

            <h2 className="-mb-2 px-0.5 text-[13px] text-muted">最近の解答（50件）</h2>
            <div className="panel overflow-hidden">
              {logs.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted">まだ記録はありません。</p>
              ) : (
                logs.map((l) => (
                  <div key={l.id} className="flex items-baseline gap-3 border-t border-line px-3.5 py-2 text-sm first:border-t-0">
                    <span className="w-[8.5em] shrink-0 text-xs tabular-nums text-muted">{fmtDateTime(l.created_at)}</span>
                    <b className="min-w-0 flex-1 truncate font-word">{BYNUM.get(l.word_no)?.word}</b>
                    <span className="text-xs text-muted">{MODE_LABEL[l.mode] ?? l.mode}</span>
                    <span className={`w-[2em] text-right text-xs font-bold ${l.correct ? "text-take" : "text-shu"}`}>{l.correct ? "○" : "×"}</span>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </Page>
    </>
  );
}
