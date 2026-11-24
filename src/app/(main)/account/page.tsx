"use client";

import { useActionState } from "react";
import { changePassword, changeUsername, logout, type AuthState } from "../../auth-actions";
import AppBar, { Page } from "@/components/AppBar";
import { useProgress } from "@/components/ProgressProvider";

function Result({ state }: { state: AuthState }) {
  if (state.error)
    return (
      <p role="alert" className="rounded-lg bg-shu-soft px-3 py-2 text-sm font-medium text-shu">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="rounded-lg bg-take-soft px-3 py-2 text-sm font-medium text-take">
        {state.ok}
      </p>
    );
  return null;
}

export default function AccountPage() {
  const { username, isAdmin } = useProgress();
  const [nameState, nameAction, namePending] = useActionState(changeUsername, {});
  const [pwState, pwAction, pwPending] = useActionState(changePassword, {});

  return (
    <>
      <AppBar title="アカウント設定" back="/" />
      <Page>
        <section className="panel grid gap-1 p-4">
          <span className="text-[13px] text-muted">ログイン中のアカウント</span>
          <p className="flex items-center gap-2 font-word text-2xl font-black">
            {username}
            {isAdmin && <span className="rounded bg-ai-soft px-1.5 py-0.5 font-body text-[11px] font-bold text-ai">管理者</span>}
          </p>
        </section>

        <form action={nameAction} className="panel grid gap-3 p-4">
          <h2 className="font-bold">アカウント名を変更</h2>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted">新しいアカウント名</span>
            <input
              id="new-username"
              className="input"
              name="username"
              key={username}
              defaultValue={nameState.username ?? username}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_]{3,20}"
              title="半角英数字と _ の3〜20文字"
            />
            <span className="text-xs text-muted">半角英数字と _ の3〜20文字。学習記録はそのまま引き継がれます。</span>
          </label>
          <Result state={nameState} />
          <button className="btn btn-primary" disabled={namePending}>
            {namePending ? "変更中…" : "アカウント名を変更"}
          </button>
        </form>

        <form action={pwAction} className="panel grid gap-3 p-4">
          <h2 className="font-bold">パスワードを変更</h2>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted">今のパスワード</span>
            <input id="current-password" className="input" type="password" name="current" autoComplete="current-password" required />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted">新しいパスワード（6文字以上）</span>
            <input id="new-password" className="input" type="password" name="password" autoComplete="new-password" required minLength={6} />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted">新しいパスワード（確認）</span>
            <input id="confirm-password" className="input" type="password" name="confirm" autoComplete="new-password" required minLength={6} />
          </label>
          <Result state={pwState} />
          <button className="btn btn-primary" disabled={pwPending}>
            {pwPending ? "変更中…" : "パスワードを変更"}
          </button>
        </form>

        <form action={logout}>
          <button className="btn w-full border-shu text-shu">ログアウト</button>
        </form>
      </Page>
    </>
  );
}
