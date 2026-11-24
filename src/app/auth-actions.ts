"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTH_EMAIL_DOMAIN, USERNAME_RE, usernameToEmail } from "@/lib/supabase/env";

export type AuthState = { error?: string; ok?: string; username?: string };

function readForm(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { username, password };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const { username, password } = readForm(formData);
  if (!username || !password) return { error: "アカウント名とパスワードを入力してください。", username };
  const supabase = await createClient();
  // アカウント名を変えていても、登録時の内部アドレスでログインする
  const { data: email } = await supabase.rpc("login_email", { p_username: username });
  const { error } = await supabase.auth.signInWithPassword({
    email: (email as string | null) ?? usernameToEmail(username),
    password,
  });
  if (error) return { error: "アカウント名かパスワードが違います。", username };
  redirect("/");
}

export async function signup(_: AuthState, formData: FormData): Promise<AuthState> {
  const { username, password } = readForm(formData);
  const confirm = String(formData.get("confirm") ?? "");
  if (!USERNAME_RE.test(username))
    return { error: "アカウント名は半角英小文字・数字・_ の3〜20文字にしてください。", username };
  if (password.length < 6) return { error: "パスワードは6文字以上にしてください。", username };
  if (password !== confirm) return { error: "確認用パスワードが一致しません。", username };

  const supabase = await createClient();
  const { data: available } = await supabase.rpc("username_available", { p_username: username });
  if (available === false) return { error: "このアカウント名はすでに使われています。", username };

  // 内部アドレスは名前と無関係にする（名前を変えても、空いた名前を別の人が使えるように）
  const { data, error } = await supabase.auth.signUp({
    email: `u-${crypto.randomUUID()}@${AUTH_EMAIL_DOMAIN}`,
    password,
    options: { data: { username } },
  });
  if (error) {
    if (/already|registered|exists|database error/i.test(error.message))
      return { error: "このアカウント名はすでに使われています。", username };
    return { error: `登録できませんでした（${error.message}）`, username };
  }
  if (!data.session)
    return {
      error: "登録はできましたが、ログインできませんでした。Supabase の Authentication 設定で「Confirm email」をオフにしてください。",
      username,
    };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changeUsername(_: AuthState, formData: FormData): Promise<AuthState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username))
    return { error: "アカウント名は半角英小文字・数字・_ の3〜20文字にしてください。", username };
  const supabase = await createClient();
  const { error } = await supabase.rpc("change_username", { p_new: username });
  if (error) {
    if (error.code === "23505" || /taken/.test(error.message)) return { error: "このアカウント名はすでに使われています。", username };
    return { error: `変更できませんでした（${error.message}）`, username };
  }
  revalidatePath("/", "layout");
  return { ok: `アカウント名を「${username}」に変更しました。次回からこの名前でログインします。`, username };
}

export async function changePassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next.length < 6) return { error: "新しいパスワードは6文字以上にしてください。" };
  if (next !== confirm) return { error: "確認用パスワードが一致しません。" };
  if (next === current) return { error: "今と違うパスワードにしてください。" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "ログインし直してから、もう一度お試しください。" };

  // 今のパスワードを確認
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyError) return { error: "今のパスワードが違います。" };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: `変更できませんでした（${error.message}）` };
  return { ok: "パスワードを変更しました。" };
}
