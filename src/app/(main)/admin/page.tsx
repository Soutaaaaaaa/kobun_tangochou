"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import { createClient } from "@/lib/supabase/client";
import { ago } from "@/lib/progress";

type Summary = {
  id: string;
  username: string;
  is_admin: boolean;
  created_at: string;
  studied: number;
  known: number;
  weak: number;
  last_studied_at: string | null;
  answers_total: number;
  answers_7d: number;
  wrong_7d: number;
};

export default function AdminPage() {
  const [rows, setRows] = useState<Summary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    createClient()
      .rpc("admin_user_summaries")
      .then(({ data, error }) => {
        if (error) setError(`読み込めませんでした（${error.message}）`);
        else setRows((data as Summary[]) ?? []);
      });
  }, []);

  const shown = (rows ?? []).filter((r) => r.username.includes(q.trim().toLowerCase()));
  const active7d = (rows ?? []).filter((r) => r.answers_7d > 0).length;

  return (
    <>
      <AppBar title="管理：アカウント一覧" back="/" />
      <Page>
        {error && <p className="panel p-4 text-sm text-shu">{error}</p>}
        {rows && (
          <section className="panel grid grid-cols-2 gap-3 p-4">
            <div>
              <p className="text-[13px] text-muted">アカウント数</p>
              <p className="font-word text-3xl font-black tabular-nums">{rows.length}</p>
            </div>
            <div>
              <p className="text-[13px] text-muted">この7日間に学習</p>
              <p className="font-word text-3xl font-black tabular-nums">{active7d}</p>
            </div>
          </section>
        )}
        <input
          id="admin-search"
          className="input"
          placeholder="アカウント名で絞り込み"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoCapitalize="none"
        />
        <div className="panel overflow-hidden">
          {rows === null && !error ? (
            <p className="p-6 text-center text-sm text-muted">読み込み中…</p>
          ) : shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">該当するアカウントがありません。</p>
          ) : (
            shown.map((r) => (
              <Link
                key={r.id}
                href={`/admin/users/${r.id}`}
                className="grid gap-1.5 border-t border-line px-3.5 py-3 first:border-t-0 hover:bg-surface-2"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <b className="truncate font-word text-[17px] font-black">
                    {r.username}
                    {r.is_admin && <span className="ml-1.5 rounded bg-ai-soft px-1 py-0.5 font-body text-[10px] font-bold text-ai">管理者</span>}
                  </b>
                  <span className="shrink-0 text-xs text-muted">最終学習 {ago(r.last_studied_at)}</span>
                </div>
                <div className="meter h-[5px]">
                  <i style={{ width: `${r.known / 4}%` }} />
                </div>
                <div className="flex flex-wrap gap-x-3 text-xs tabular-nums text-muted">
                  <span>
                    覚えた <b className="text-ink">{r.known}</b>/400
                  </span>
                  <span>学習済 {r.studied}</span>
                  <span className="text-shu">苦手 {r.weak}</span>
                  <span>
                    7日間 {r.answers_7d}問（不正解 {r.wrong_7d}）
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </Page>
    </>
  );
}
