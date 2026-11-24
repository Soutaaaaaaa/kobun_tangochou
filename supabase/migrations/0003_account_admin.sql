-- アカウント名・パスワードの変更と、管理者（Admin）機能
-- 0001, 0002 のあとに SQL Editor で実行してください。何度実行しても問題ありません。

-- ---------- 管理者フラグ ----------
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- 自分が管理者か（RLS の中から使う。security definer で profiles の RLS を通さずに読む）
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 管理者は全員の情報を読める（書き換えはできない）
drop policy if exists "profiles: admin read all" on public.profiles;
create policy "profiles: admin read all" on public.profiles
  for select using (public.is_admin());

drop policy if exists "word_progress: admin read all" on public.word_progress;
create policy "word_progress: admin read all" on public.word_progress
  for select using (public.is_admin());

drop policy if exists "study_logs: admin read all" on public.study_logs;
create policy "study_logs: admin read all" on public.study_logs
  for select using (public.is_admin());

-- ---------- ログイン用：アカウント名 → 内部のメールアドレス ----------
-- アカウント名を変えてもログインできるように、名前から登録時のアドレスを引く
create or replace function public.login_email(p_username text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email::text
  from auth.users u
  join public.profiles p on p.id = u.id
  where p.username = lower(trim(p_username));
$$;
revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;

create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not exists (select 1 from public.profiles where username = lower(trim(p_username)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------- アカウント名の変更 ----------
create or replace function public.change_username(p_new text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v text := lower(trim(p_new));
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if v !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'invalid username' using errcode = '22023';
  end if;
  update public.profiles set username = v where id = auth.uid();
  return v;
exception
  when unique_violation then
    raise exception 'username taken' using errcode = '23505';
end;
$$;
revoke all on function public.change_username(text) from public;
grant execute on function public.change_username(text) to authenticated;

-- ---------- 管理者用：全アカウントの集計 ----------
-- 管理者以外が呼ぶと 0 行
create or replace function public.admin_user_summaries()
returns table (
  id uuid,
  username text,
  is_admin boolean,
  created_at timestamptz,
  studied integer,
  known integer,
  weak integer,
  last_studied_at timestamptz,
  answers_total integer,
  answers_7d integer,
  wrong_7d integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.username, p.is_admin, p.created_at,
    (select count(*) from public.word_progress w where w.user_id = p.id and w.last_studied_at is not null)::int,
    (select count(*) from public.word_progress w where w.user_id = p.id and w.last_result and not w.is_weak)::int,
    (select count(*) from public.word_progress w where w.user_id = p.id and w.is_weak)::int,
    (select max(w.last_studied_at) from public.word_progress w where w.user_id = p.id),
    (select count(*) from public.study_logs l where l.user_id = p.id)::int,
    (select count(*) from public.study_logs l where l.user_id = p.id and l.created_at > now() - interval '7 days')::int,
    (select count(*) from public.study_logs l where l.user_id = p.id and not l.correct and l.created_at > now() - interval '7 days')::int
  from public.profiles p
  where public.is_admin()
  order by 8 desc nulls last, p.created_at;
$$;
revoke all on function public.admin_user_summaries() from public;
grant execute on function public.admin_user_summaries() to authenticated;

-- ---------- souta を管理者にする ----------
update public.profiles set is_admin = true where username = 'souta';

notify pgrst, 'reload schema';
