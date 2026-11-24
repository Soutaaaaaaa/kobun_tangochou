"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";
import type { QuizFormat } from "@/components/Quiz";
import { studyHref } from "@/lib/study-url";
import { CATS, SECTIONS, wordsInRanges, type Range } from "@/lib/words";

type Tab = "pick" | "number";

function Seg<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button key={String(v)} type="button" className="seg-btn" aria-pressed={v === value} onClick={() => onChange(v)}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** 重なる範囲をまとめる */
function mergeRanges(rs: Range[]): Range[] {
  const sorted = rs.slice().sort((a, b) => a[0] - b[0]);
  const out: Range[] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && r[0] <= last[1] + 1) last[1] = Math.max(last[1], r[1]);
    else out.push([r[0], r[1]]);
  }
  return out;
}

function RandomForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { progress } = useProgress();

  const [tab, setTab] = useState<Tab>("pick");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("100");
  const [mode, setMode] = useState<"cards" | "quiz">("quiz");
  const [format, setFormat] = useState<QuizFormat>("mix");
  const [count, setCount] = useState(20);
  const [weakOnly, setWeakOnly] = useState(false);

  useEffect(() => {
    const sec = Number(params.get("sec"));
    if (sec >= 1 && sec <= SECTIONS.length) setPicked(new Set([`s${sec}`]));
  }, [params]);

  const toggle = (key: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const nFrom = Number(from);
  const nTo = Number(to);
  const numberError =
    !Number.isInteger(nFrom) || !Number.isInteger(nTo) || nFrom < 1 || nTo > 400 || nFrom > nTo
      ? "1〜400 の番号で、「から」が「まで」以下になるように入力してください。"
      : null;

  const { ranges, label } = useMemo(() => {
    if (tab === "number") {
      return { ranges: numberError ? [] : ([[nFrom, nTo]] as Range[]), label: `No.${nFrom}–${nTo}` };
    }
    const rs: Range[] = [];
    const names: string[] = [];
    for (const c of CATS)
      if (picked.has(`c${c.id}`)) {
        rs.push([c.from, c.to]);
        names.push(c.name);
      }
    for (const s of SECTIONS)
      if (picked.has(`s${s.id}`) && !picked.has(`c${s.cat.id}`)) {
        rs.push([s.from, s.to]);
        names.push(`S${s.id}`);
      }
    return { ranges: mergeRanges(rs), label: names.join("・") || "未選択" };
  }, [tab, picked, nFrom, nTo, numberError]);

  const pool = useMemo(
    () => wordsInRanges(ranges).filter((w) => !weakOnly || progress.get(w.n)?.is_weak),
    [ranges, weakOnly, progress],
  );
  const actual = count === 0 ? pool.length : Math.min(count, pool.length);

  const start = () => {
    router.push(
      studyHref({
        mode,
        ranges,
        count,
        order: "random",
        weakOnly,
        format,
        title: `ランダム：${label}${weakOnly ? "（苦手）" : ""}`,
      }),
    );
  };

  return (
    <Page>
      <section className="panel grid gap-4 p-4">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
          {(
            [
              ["pick", "範囲から選ぶ"],
              ["number", "番号で指定"],
            ] as [Tab, string][]
          ).map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTab(v)}
              aria-pressed={tab === v}
              className={`rounded-lg py-2 text-sm font-bold ${tab === v ? "bg-surface text-ai shadow-card" : "text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "pick" ? (
          <div className="grid gap-4">
            <div>
              <h3 className="mb-1.5 text-[13px] text-muted">区分（まとめて選ぶ）</h3>
              <div className="flex flex-wrap gap-1.5">
                {CATS.map((c) => (
                  <button key={c.id} className="seg-btn" aria-pressed={picked.has(`c${c.id}`)} onClick={() => toggle(`c${c.id}`)}>
                    {c.name}
                    <small className="ml-1 tabular-nums text-muted">
                      {c.from}–{c.to}
                    </small>
                  </button>
                ))}
              </div>
            </div>
            {CATS.map((c) => (
              <div key={c.id}>
                <h3 className="mb-1.5 text-[13px] text-muted" style={{ ["--cc" as string]: c.color }}>
                  <span className="chip-dot">{c.name}のセクション</span>
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(92px,1fr))] gap-1.5">
                  {SECTIONS.filter((s) => s.cat === c).map((s) => {
                    const viaCat = picked.has(`c${c.id}`);
                    return (
                      <button
                        key={s.id}
                        className="seg-btn rounded-lg px-2 text-left leading-tight"
                        aria-pressed={viaCat || picked.has(`s${s.id}`)}
                        disabled={viaCat}
                        onClick={() => toggle(`s${s.id}`)}
                      >
                        <span className="block">S{s.id}</span>
                        <small className="tabular-nums text-muted">
                          {s.from}–{s.to}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {picked.size > 0 && (
              <button className="justify-self-start text-[13px] font-bold text-ai" onClick={() => setPicked(new Set())}>
                選択をすべて解除
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-2">
            <h3 className="text-[13px] text-muted">単語番号（1〜400）</h3>
            <div className="flex items-center gap-2">
              <input
                id="range-from"
                className="input w-24 text-center tabular-nums"
                inputMode="numeric"
                value={from}
                onChange={(e) => setFrom(e.target.value.replace(/\D/g, ""))}
                aria-label="開始番号"
              />
              <span className="text-muted">から</span>
              <input
                id="range-to"
                className="input w-24 text-center tabular-nums"
                inputMode="numeric"
                value={to}
                onChange={(e) => setTo(e.target.value.replace(/\D/g, ""))}
                aria-label="終了番号"
              />
              <span className="text-muted">まで</span>
            </div>
            {numberError && <p className="text-[13px] text-shu">{numberError}</p>}
          </div>
        )}
      </section>

      <section className="panel grid gap-4 p-4">
        <div>
          <h3 className="mb-1.5 text-[13px] text-muted">出題のしかた</h3>
          <Seg
            value={mode}
            onChange={setMode}
            options={[
              ["quiz", "四択クイズ"],
              ["cards", "単語カード"],
            ]}
          />
        </div>
        {mode === "quiz" && (
          <div>
            <h3 className="mb-1.5 text-[13px] text-muted">クイズの形式</h3>
            <Seg
              value={format}
              onChange={setFormat}
              options={[
                ["mix", "ミックス"],
                ["w2m", "古語 → 意味"],
                ["m2w", "意味 → 古語"],
              ]}
            />
          </div>
        )}
        <div>
          <h3 className="mb-1.5 text-[13px] text-muted">出題数</h3>
          <Seg
            value={count}
            onChange={setCount}
            options={[
              [10, "10語"],
              [20, "20語"],
              [40, "40語"],
              [0, "すべて"],
            ]}
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-muted">
          <input type="checkbox" className="h-4 w-4 accent-[var(--ai)]" checked={weakOnly} onChange={(e) => setWeakOnly(e.target.checked)} />
          苦手リストの単語だけ
        </label>
        <p className="text-[13px] text-muted">
          {pool.length
            ? `対象 ${pool.length} 語から ${actual} 語をランダムに出題します。`
            : ranges.length
              ? "この範囲に該当する単語がありません。"
              : "範囲を選んでください。"}
        </p>
        <button className="btn btn-primary" disabled={!pool.length} onClick={start}>
          スタート
        </button>
      </section>
    </Page>
  );
}

export default function RandomPage() {
  return (
    <>
      <AppBar title="ランダム出題" back="/" />
      <Suspense>
        <RandomForm />
      </Suspense>
    </>
  );
}
