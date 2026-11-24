export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase Auth はメールアドレスが必須なので、アカウント名から内部用のアドレスを作る。
 * 実在しないドメインで、メールは送られない（Supabase 側で「Confirm email」をオフにしておく）。
 */
export const AUTH_EMAIL_DOMAIN = process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN || "kobun-tango.local";
export const usernameToEmail = (username: string) => `${username.toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
