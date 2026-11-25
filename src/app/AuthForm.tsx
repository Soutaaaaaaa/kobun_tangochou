"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "./auth-actions";

type Props = {
  mode: "login" | "signup";
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
};

export default function AuthForm({ mode, action }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const signup = mode === "signup";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="text-center">
        <p className="font-word text-4xl font-black tracking-wider">古典学習帳</p>
        <p className="mt-1 text-sm text-muted">{signup ? "アカウントを作成" : "ログイン"}</p>
      </div>
      <form action={formAction} className="panel grid gap-4 p-5">
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted">アカウント名</span>
          <input
            className="input"
            name="username"
            defaultValue={state.username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={3}
            maxLength={20}
            pattern="[A-Za-z0-9_]{3,20}"
            title="半角英数字と _ の3〜20文字"
          />
          {signup && <span className="text-xs text-muted">半角英数字と _ の3〜20文字（大文字は小文字として扱います）</span>}
        </label>
        <label className="grid gap-1.5 text-sm">
          <span className="text-muted">パスワード</span>
          <input
            className="input"
            type="password"
            name="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={6}
          />
          {signup && <span className="text-xs text-muted">6文字以上</span>}
        </label>
        {signup && (
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted">パスワード（確認）</span>
            <input className="input" type="password" name="confirm" autoComplete="new-password" required minLength={6} />
          </label>
        )}
        {state.error && (
          <p role="alert" className="rounded-lg bg-shu-soft px-3 py-2 text-sm font-medium text-shu">
            {state.error}
          </p>
        )}
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "処理中…" : signup ? "アカウントを作成" : "ログイン"}
        </button>
      </form>
      <p className="text-center text-sm text-muted">
        {signup ? "アカウントをお持ちの方は " : "はじめての方は "}
        <Link className="font-bold text-ai underline-offset-2 hover:underline" href={signup ? "/login" : "/signup"}>
          {signup ? "ログイン" : "アカウントを作成"}
        </Link>
      </p>
    </main>
  );
}
