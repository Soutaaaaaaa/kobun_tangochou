"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { USERNAME_RE, usernameToEmail } from "@/lib/supabase/env";

export type AuthState = { error?: string; username?: string };

function readForm(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  return { username, password };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const { username, password } = readForm(formData);
  if (!username || !password) return { error: "アカウント名とパスワードを入力してください。", username };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password });
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
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: { data: { username } },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message))
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
