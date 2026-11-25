"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyMode } from "@/lib/progress";
import { CIRC, catOf, homographHint, type Word } from "@/lib/words";
import { InlineMeans, MeanText } from "./Mean";
import { useProgress } from "./ProgressProvider";

type Props = {
  words: Word[];
  title: string;
  quizHref?: string;
  /** 記録の種類（今日の復習では "review"） */
  recordMode?: StudyMode;
  /** カードの表に出す出題理由（今日の復習用）。キーは単語番号 */
  badges?: Record<number, { text: string; priority: boolean }>;
  /** 結果画面に足すボタン */
  footer?: React.ReactNode;
};

/**
 * 単語カード。
 * めくる前: フリック（またはタップ）でめくる。
 * めくった後: 合っていたら左、間違えたら右へフリック。
 */
export default function FlashCards({ words, title, quizHref, recordMode = "card", badges, footer }: Props) {
  const { record } = useProgress();
  const [deck, setDeck] = useState(words);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [ok, setOk] = useState<Word[]>([]);
  const [ng, setNg] = useState<Word[]>([]);
  const busy = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const stampOk = useRef<HTMLDivElement>(null);
  const stampNg = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, sx: 0, dx: 0, t0: 0 });
  const stageRef = useRef<HTMLDivElement>(null);

  // ブラウザの「スワイプで戻る」を抑える。
  // React のタッチイベントは passive なので preventDefault が効かない → ネイティブで登録する。
  useEffect(() => {
    const stage = stageRef.current;
    // カードの上でのスワイプは、ページのスクロールや戻る操作に渡さない
    const onStageTouch = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    // 画面の左右の端から始まるスワイプ（iPhone の Safari などの「戻る」操作）を止める
    const EDGE = 28;
    const onEdgeTouch = (e: TouchEvent) => {
      // ボタンやリンクのタップは邪魔しない
      if ((e.target as Element | null)?.closest?.("button, a, input, label, select, textarea")) return;
      const x = e.touches[0]?.clientX ?? 0;
      if (e.cancelable && (x < EDGE || x > window.innerWidth - EDGE)) e.preventDefault();
    };
    if (!stage) return; // 結果画面では何もしない
    stage.addEventListener("touchstart", onStageTouch, { passive: false });
    stage.addEventListener("touchmove", onStageTouch, { passive: false });
    document.addEventListener("touchstart", onEdgeTouch, { passive: false });
    return () => {
      stage.removeEventListener("touchstart", onStageTouch);
      stage.removeEventListener("touchmove", onStageTouch);
      document.removeEventListener("touchstart", onEdgeTouch);
    };
  }, [i, deck]);

  const restart = (list: Word[]) => {
    setDeck(list);
    setI(0);
    setOk([]);
    setNg([]);
    setFlipped(false);
    busy.current = false;
  };

  const flip = useCallback(() => {
    if (!busy.current) setFlipped((f) => !f);
  }, []);

  const commit = useCallback(
    (isOk: boolean) => {
      if (busy.current || !flipped) return;
      const w = deck[i];
      if (!w) return;
      busy.current = true;
      record(w.n, isOk, recordMode);
      (isOk ? setOk : setNg)((l) => [...l, w]);
      const el = cardRef.current;
      if (el) {
        const dir = isOk ? -1 : 1;
        el.style.transition = "transform .3s ease-in, opacity .3s";
        el.style.transform = `translateX(${dir * 140}%) rotate(${dir * 18}deg)`;
        el.style.opacity = "0";
        const st = (isOk ? stampOk : stampNg).current;
        if (st) st.style.opacity = "1";
      }
      setTimeout(() => {
        setFlipped(false);
        setI((x) => x + 1);
        busy.current = false;
      }, 260);
    },
    [deck, i, flipped, record, recordMode],
  );

  // カードが替わったら位置をリセット
  useEffect(() => {
    const el = cardRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = "";
      el.style.opacity = "1";
    }
    if (stampOk.current) stampOk.current.style.opacity = "0";
    if (stampNg.current) stampNg.current.style.opacity = "0";
  }, [i, deck]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (i >= deck.length) return;
      if ([" ", "Enter", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowLeft") flipped ? commit(true) : flip();
      else if (e.key === "ArrowRight") flipped ? commit(false) : flip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flip, commit, flipped, i, deck.length]);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy.current) return;
    drag.current = { active: true, sx: e.clientX, dx: 0, t0: Date.now() };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.dx = e.clientX - d.sx;
    e.currentTarget.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 22}deg)`;
    if (flipped) {
      if (stampOk.current) stampOk.current.style.opacity = String(Math.max(0, Math.min(1, -d.dx / 90)));
      if (stampNg.current) stampNg.current.style.opacity = String(Math.max(0, Math.min(1, d.dx / 90)));
    }
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const el = e.currentTarget;
    const dt = Date.now() - d.t0;
    const moved = Math.abs(d.dx);
    const fast = moved > 30 && moved / dt > 0.5;
    el.style.transition = "transform .25s ease-out";
    if (stampOk.current) stampOk.current.style.opacity = "0";
    if (stampNg.current) stampNg.current.style.opacity = "0";
    if (moved > 80 || fast) {
      if (!flipped) {
        el.style.transform = "";
        flip();
      } else commit(d.dx < 0);
    } else {
      el.style.transform = "";
      if (moved < 8 && dt < 400 && e.type === "pointerup") flip();
    }
  };

  /* ---------- 結果 ---------- */
  if (i >= deck.length) {
    return (
      <div className="flex flex-col gap-4">
        <section className="panel grid gap-1.5 px-4 py-6 text-center">
          <p className="text-sm text-muted">{title}</p>
          <div className="font-word text-5xl font-black tabular-nums">
            {ok.length}
            <small className="text-xl text-muted"> / {ok.length + ng.length}</small>
          </div>
          <p className="text-sm text-muted">
            覚えた {ok.length} 語・まだ {ng.length} 語
          </p>
        </section>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-primary" disabled={!ng.length} onClick={() => restart(ng)}>
            「まだ」の {ng.length} 語をもう一度
          </button>
          <button className="btn" onClick={() => restart(words)}>
            最初からもう一度
          </button>
        </div>
        {footer}
        {quizHref && (
          <Link className="btn" href={quizHref}>
            この範囲の四択クイズへ
          </Link>
        )}
        {ng.length > 0 && (
          <>
            <p className="-mb-2 px-0.5 text-[13px] text-muted">まだの単語</p>
            <div className="panel overflow-hidden">
              {ng.map((w) => (
                <div key={w.n} className="border-t border-line px-3.5 py-2.5 first:border-t-0">
                  <span className="mr-2 text-xs tabular-nums text-muted">{w.n}</span>
                  <b className="font-word text-[17px] font-black">{w.word}</b>
                  <div className="mt-0.5 text-[13px] text-muted">
                    <InlineMeans w={w} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  /* ---------- カード ---------- */
  const w = deck[i];
  const next = deck[i + 1];
  const c = catOf(w.n);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <div className="flex justify-between text-[13px] tabular-nums text-muted">
          <span>
            {i + 1} / {deck.length}
          </span>
          <span>
            <span className="font-bold text-take">覚えた {ok.length}</span>　<span className="font-bold text-shu">まだ {ng.length}</span>
          </span>
        </div>
        <div className="meter">
          <i style={{ width: `${(i / deck.length) * 100}%`, background: "var(--ai)" }} />
        </div>
      </div>

      <div ref={stageRef} className="relative h-[min(56vh,440px)] min-h-[330px] touch-none overscroll-x-none [perspective:1200px]">
        {next && (
          <div className="pointer-events-none absolute inset-0 translate-y-2.5 scale-95 rounded-[18px] border border-line bg-surface opacity-70 shadow-card" />
        )}
        <div
          key={`${w.n}-${i}`}
          ref={cardRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          className="absolute inset-0 cursor-grab touch-none select-none"
          style={{ ["--cc" as string]: c.color }}
        >
          <div ref={stampOk} className="pointer-events-none absolute left-[18px] top-[22px] z-[2] -rotate-[10deg] rounded-lg border-[3px] border-take bg-surface px-3 py-1 text-xl font-bold text-take opacity-0">
            覚えた
          </div>
          <div ref={stampNg} className="pointer-events-none absolute right-[18px] top-[22px] z-[2] rotate-[10deg] rounded-lg border-[3px] border-shu bg-surface px-3 py-1 text-xl font-bold text-shu opacity-0">
            まだ
          </div>
          <div
            className="absolute inset-0 transition-transform duration-[450ms] [transform-style:preserve-3d]"
            style={{ transform: flipped ? "rotateY(180deg)" : "none", transitionTimingFunction: "cubic-bezier(.3,.7,.2,1)" }}
          >
            {/* 表 */}
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface p-5 shadow-card [backface-visibility:hidden]">
              <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: c.color }} />
              <div className="flex justify-between text-xs tabular-nums text-muted">
                <span>{c.name}</span>
                <span>No.{w.n}</span>
              </div>
              {badges?.[w.n] && (
                <span
                  className={`mt-2 self-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    badges[w.n].priority ? "bg-shu-soft text-shu" : "bg-surface-2 text-muted"
                  }`}
                >
                  {badges[w.n].text}
                </span>
              )}
              <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center">
                <b className="break-all font-word text-[clamp(34px,11vw,52px)] font-black leading-tight tracking-wider">{w.word}</b>
                {/* 漢字表記は意味のヒントになるので表では出さず、めくった後（裏）にだけ表示する */}
                <span className="flex flex-wrap justify-center gap-1.5">
                  <span className="rounded border border-line px-1.5 text-xs text-muted">{w.pos}</span>
                  {homographHint(w) && (
                    <span className="rounded bg-surface-2 px-1.5 text-xs font-bold text-muted">{homographHint(w)}</span>
                  )}
                </span>
              </div>
            </div>
            {/* 裏 */}
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[18px] border border-line bg-surface p-5 shadow-card [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <span className="absolute inset-y-0 left-0 w-[5px]" style={{ background: c.color }} />
              <div className="flex flex-wrap items-baseline gap-2 border-b border-dashed border-line pb-2.5">
                <b className="font-word text-2xl font-black">{w.word}</b>
                <small className="text-[13px] text-muted">
                  {w.kanji && `${w.kanji}　`}
                  {w.pos}
                </small>
              </div>
              <ol className="mt-3 grid flex-1 content-start gap-2.5 overflow-y-auto">
                {w.means.map((m, k) => (
                  <li key={k} className="grid grid-cols-[1.4em_1fr] gap-1 text-base font-medium leading-normal text-shu">
                    <span>{w.means.length > 1 ? CIRC[k] : "・"}</span>
                    <span>
                      <MeanText m={m} />
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted">
        {flipped ? "← 合っていたら左へ　／　間違えたら右へ →" : "フリック（またはタップ）でめくる"}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <button className="btn border-take text-take" disabled={!flipped} onClick={() => commit(true)}>
          ← 覚えた
        </button>
        <button className="btn" onClick={flip}>
          めくる
        </button>
        <button className="btn border-shu text-shu" disabled={!flipped} onClick={() => commit(false)}>
          まだ →
        </button>
      </div>
    </div>
  );
}
