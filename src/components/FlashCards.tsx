"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StudyMode } from "@/lib/progress";
import { clearSession, saveSession, type CardSave } from "@/lib/session-store";
import { useSettings } from "@/lib/settings";
import { similarWords } from "@/lib/similar";
import { TIPS } from "@/lib/tips";
import TipBox from "./TipBox";
import { BYNUM, CIRC, catOf, homographHint, type Word } from "@/lib/words";
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
  /** 中断・再開用の保存キー（なければ保存しない） */
  saveKey?: string;
  /** 中断中の一覧から戻ってくるためのURL */
  saveHref?: string;
  /** 前回中断したところから再開する */
  resume?: CardSave;
};

const toWords = (ns: number[]) => ns.map((n) => BYNUM.get(n)).filter((w): w is Word => !!w);

/**
 * 単語カード。
 * めくる前: フリック（またはタップ）でめくる。
 * めくった後: 合っていたら左、間違えたら右へフリック。
 */
export default function FlashCards({ words, title, quizHref, recordMode = "card", badges, footer, saveKey, saveHref, resume }: Props) {
  const { record } = useProgress();
  const [{ showTips }] = useSettings();
  const [deck, setDeck] = useState(() => (resume ? toWords(resume.words) : words));
  const [i, setI] = useState(resume?.i ?? 0);
  const [flipped, setFlipped] = useState(false);
  const [ok, setOk] = useState<Word[]>(() => (resume ? toWords(resume.ok) : []));
  const [ng, setNg] = useState<Word[]>(() => (resume ? toWords(resume.ng) : []));
  const [paused, setPaused] = useState(false);
  /** めくった直後は、勢いあまったフリックで次へ進まないよう少し待つ */
  const flippedAt = useRef(0);
  const busy = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const stampOk = useRef<HTMLDivElement>(null);
  const stampNg = useRef<HTMLDivElement>(null);
  /** axis: 指の動きが横（x）か縦（y＝ページのスクロール）か。最初の動きで決める */
  const drag = useRef({ active: false, sx: 0, sy: 0, dx: 0, t0: 0, axis: "" as "" | "x" | "y" });
  const stageRef = useRef<HTMLDivElement>(null);

  // ブラウザの「スワイプで戻る」を抑える。
  // React のタッチイベントは passive なので preventDefault が効かない → ネイティブで登録する。
  useEffect(() => {
    const stage = stageRef.current;
    // カードの上での横スワイプは、ブラウザの「戻る」操作に渡さない（縦はページのスクロールに使う）
    let tx = 0;
    let ty = 0;
    let axis: "" | "x" | "y" = "";
    const onStageStart = (e: TouchEvent) => {
      tx = e.touches[0]?.clientX ?? 0;
      ty = e.touches[0]?.clientY ?? 0;
      axis = "";
    };
    const onStageMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      if (!axis) {
        const ax = Math.abs(t.clientX - tx);
        const ay = Math.abs(t.clientY - ty);
        if (ax < 6 && ay < 6) return;
        axis = ax > ay ? "x" : "y";
      }
      if (axis === "x" && e.cancelable) e.preventDefault();
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
    stage.addEventListener("touchstart", onStageStart, { passive: true });
    stage.addEventListener("touchmove", onStageMove, { passive: false });
    document.addEventListener("touchstart", onEdgeTouch, { passive: false });
    return () => {
      stage.removeEventListener("touchstart", onStageStart);
      stage.removeEventListener("touchmove", onStageMove);
      document.removeEventListener("touchstart", onEdgeTouch);
    };
  }, [i, deck, paused]);

  const restart = (list: Word[]) => {
    setDeck(list);
    setI(0);
    setOk([]);
    setNg([]);
    setFlipped(false);
    setPaused(false);
    busy.current = false;
    if (saveKey) clearSession(saveKey);
  };

  const flip = useCallback(() => {
    if (busy.current) return;
    setFlipped((f) => {
      if (!f) flippedAt.current = Date.now();
      return !f;
    });
  }, []);

  const commit = useCallback(
    (isOk: boolean) => {
      if (busy.current || !flipped) return;
      const w = deck[i];
      if (!w) return;
      busy.current = true;
      record(w.n, isOk, recordMode);
      const nextOk = isOk ? [...ok, w] : ok;
      const nextNg = isOk ? ng : [...ng, w];
      setOk(nextOk);
      setNg(nextNg);
      if (saveKey)
        saveSession(saveKey, {
          kind: "cards",
          title,
          href: saveHref ?? "/",
          i: i + 1,
          total: deck.length,
          words: deck.map((x) => x.n),
          ok: nextOk.map((x) => x.n),
          ng: nextNg.map((x) => x.n),
        });
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
        // 似た意味の単語を見ていて下にスクロールしていたら、次のカードが見えるよう上に戻す
        if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: "smooth" });
        busy.current = false;
      }, 260);
    },
    [deck, i, flipped, record, recordMode, ok, ng, saveKey, saveHref, title],
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
      if (i >= deck.length || paused) return;
      if ([" ", "Enter", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
        flip();
      } else if (e.key === "ArrowLeft") flipped ? commit(true) : flip();
      else if (e.key === "ArrowRight") flipped ? commit(false) : flip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [flip, commit, flipped, i, deck.length, paused]);

  const resetCard = (el: HTMLElement) => {
    el.style.transition = "transform .25s ease-out";
    el.style.transform = "";
    if (stampOk.current) stampOk.current.style.opacity = "0";
    if (stampNg.current) stampNg.current.style.opacity = "0";
  };
  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (busy.current || !e.isPrimary) return;
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, dx: 0, t0: Date.now(), axis: "" };
    e.currentTarget.style.transition = "none";
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    // 最初の動きで、横（カード操作）か縦（スクロール）かを決める。斜めの動きは縦扱い
    if (!d.axis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      d.axis = Math.abs(dx) > Math.abs(dy) * 1.3 ? "x" : "y";
      if (d.axis === "x") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.axis !== "x") return;
    d.dx = dx;
    e.currentTarget.style.transform = `translateX(${dx}px) rotate(${dx / 22}deg)`;
    if (flipped) {
      if (stampOk.current) stampOk.current.style.opacity = String(Math.max(0, Math.min(1, -dx / 100)));
      if (stampNg.current) stampNg.current.style.opacity = String(Math.max(0, Math.min(1, dx / 100)));
    }
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const el = e.currentTarget;
    const dt = Date.now() - d.t0;
    if (d.axis === "y") return resetCard(el);
    if (d.axis === "") {
      // ほぼ動いていない短いタップ → めくる
      resetCard(el);
      if (dt < 400) flip();
      return;
    }
    const moved = Math.abs(d.dx);
    const fast = moved > 50 && moved / dt > 0.6;
    if (!(moved > 100 || fast)) return resetCard(el);
    if (!flipped) {
      resetCard(el);
      flip();
    } else if (Date.now() - flippedAt.current < 350) {
      // めくった直後の勢いあまったフリックは無視
      resetCard(el);
    } else commit(d.dx < 0);
  };
  /** スクロールなどでブラウザに操作を取られたときは、何もせず元に戻す */
  const onCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current.active = false;
    resetCard(e.currentTarget);
  };

  const pause = () => {
    setPaused(true);
    window.scrollTo(0, 0);
  };

  /* ---------- 中断 ---------- */
  if (paused && i < deck.length) {
    return (
      <div className="flex flex-col gap-4">
        <section className="panel grid gap-1.5 px-4 py-6 text-center">
          <p className="text-sm text-muted">{title}（中断中）</p>
          <div className="font-word text-5xl font-black tabular-nums">
            {i}
            <small className="text-xl text-muted"> / {deck.length}</small>
          </div>
          <p className="text-sm text-muted">
            覚えた {ok.length} 語・まだ {ng.length} 語
          </p>
          <p className="mt-1 text-xs text-muted">
            ここまでの記録は保存されています。{saveKey && "トップ画面の「中断中の学習」からも続きを再開できます。"}
          </p>
        </section>
        <button className="btn btn-primary" onClick={() => setPaused(false)}>
          続きから再開（{i + 1}語目から）
        </button>
        <Link className="btn" href="/">
          トップへ
        </Link>
      </div>
    );
  }

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
                  {showTips && TIPS.get(w.n) && <p className="mt-1.5 rounded-lg bg-ai-soft px-2.5 py-1.5 text-[13px] leading-relaxed text-ink"><b className="mr-1 text-ai">コツ</b>{TIPS.get(w.n)}</p>}
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
  const similar = similarWords(w);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2">
        <div className="flex items-center justify-between text-[13px] tabular-nums text-muted">
          <span>
            {i + 1} / {deck.length}
          </span>
          <span className="flex items-center gap-3">
            <span>
              <span className="font-bold text-take">覚えた {ok.length}</span>　<span className="font-bold text-shu">まだ {ng.length}</span>
            </span>
            <button onClick={pause} className="flex h-9 items-center rounded-lg border border-line bg-surface px-4 text-sm font-bold text-ink">
              中断
            </button>
          </span>
        </div>
        <div className="meter">
          <i style={{ width: `${(i / deck.length) * 100}%`, background: "var(--ai)" }} />
        </div>
      </div>

      <div ref={stageRef} className="relative h-[min(56vh,440px)] min-h-[330px] touch-pan-y overscroll-x-none [perspective:1200px]">
        {next && (
          <div className="pointer-events-none absolute inset-0 translate-y-2.5 scale-95 rounded-[18px] border border-line bg-surface opacity-70 shadow-card" />
        )}
        <div
          key={`${w.n}-${i}`}
          ref={cardRef}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          className="absolute inset-0 cursor-grab touch-pan-y select-none"
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
              {/* 意味が長いときはカードの中でスクロール */}
              <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain">
              <ol className="grid content-start gap-2.5">
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
      </div>


      {/* めくったらすぐ、カードのすぐ下に覚え方のコツ */}
      {showTips && flipped && <TipBox key={w.n} w={w} className="-mt-1" />}

      <p className="whitespace-pre-line text-center text-xs text-muted">
        {flipped
          ? `← 合っていたら左へ　／　間違えたら右へ →${similar.length ? "\n下にスクロールすると似た意味の単語" : ""}`
          : "フリック（またはタップ）でめくる"}
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

      {/* めくった後だけ：似た意味の単語（下にスクロールすると見える） */}
      {flipped && similar.length > 0 && (
        <section className="grid gap-1.5 pt-2">
          <h3 className="px-0.5 text-[13px] font-bold text-muted">「{w.word}」と似た意味の単語</h3>
          <div className="panel overflow-hidden">
            {similar.map(({ word: o, shared }) => (
              <div key={o.n} className="border-t border-line px-3.5 py-2.5 first:border-t-0">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <b className="font-word text-[17px] font-black">{o.word}</b>
                  <small className="text-xs text-muted">
                    {o.kanji && `［${o.kanji}］`}
                    No.{o.n}
                  </small>
                  {shared.length > 0 && (
                    <span className="ml-auto rounded bg-surface-2 px-1.5 text-[11px] text-muted">共通：{shared.slice(0, 2).join("・")}</span>
                  )}
                </div>
                <div className="mt-0.5 text-[13px] leading-relaxed text-ink">
                  <InlineMeans w={o} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
