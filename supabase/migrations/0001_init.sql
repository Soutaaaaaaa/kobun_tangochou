-- 古文単語400: スキーマ
-- Supabase の SQL Editor でこのファイルをそのまま実行してください。

-- ---------- プロフィール（アカウント名） ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

-- サインアップ時にプロフィールを自動作成（アカウント名は user_metadata.username）
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 単語ごとの学習状況 ----------
create table if not exists public.word_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  word_no smallint not null check (word_no between 1 and 400),
  is_weak boolean not null default false,          -- 苦手リストに入っているか
  last_result boolean,                              -- 直近の結果（true=正解/覚えた）
  correct_count integer not null default 0,
  wrong_count integer not null default 0,
  streak integer not null default 0,                -- 連続正解数
  first_studied_at timestamptz,
  last_studied_at timestamptz,                      -- 最後に学習した日時
  last_correct_at timestamptz,                      -- 最後に正解した日時
  last_wrong_at timestamptz,                        -- 最後に間違えた日時
  updated_at timestamptz not null default now(),
  primary key (user_id, word_no)
);

alter table public.word_progress enable row level security;

drop policy if exists "word_progress: own rows" on public.word_progress;
create policy "word_progress: own rows" on public.word_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 解答の履歴（いつ・どの単語を・正解/不正解） ----------
create table if not exists public.study_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  word_no smallint not null check (word_no between 1 and 400),
  correct boolean not null,
  mode text not null check (mode in ('card', 'quiz', 'review')),
  created_at timestamptz not null default now()
);

create index if not exists study_logs_user_time on public.study_logs (user_id, created_at desc);

alter table public.study_logs enable row level security;

drop policy if exists "study_logs: read own" on public.study_logs;
create policy "study_logs: read own" on public.study_logs
  for select using (auth.uid() = user_id);
drop policy if exists "study_logs: insert own" on public.study_logs;
create policy "study_logs: insert own" on public.study_logs
  for insert with check (auth.uid() = user_id);

-- ---------- 1回の解答を記録する ----------
-- 不正解 → 苦手に入れる。カードで「覚えた」→ 苦手から外す。クイズは2回連続正解で苦手から外す。
create or replace function public.record_answer(p_word_no integer, p_correct boolean, p_mode text)
returns public.word_progress
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.word_progress;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  insert into public.word_progress as wp (
    user_id, word_no, is_weak, last_result, correct_count, wrong_count, streak,
    first_studied_at, last_studied_at, last_correct_at, last_wrong_at, updated_at
  ) values (
    uid, p_word_no, not p_correct, p_correct,
    case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end,
    case when p_correct then 1 else 0 end,
    now(), now(),
    case when p_correct then now() end,
    case when p_correct then null else now() end,
    now()
  )
  on conflict (user_id, word_no) do update set
    is_weak = case
      when not p_correct then true
      when p_mode = 'card' then false
      when wp.streak + 1 >= 2 then false
      else wp.is_weak
    end,
    last_result = p_correct,
    correct_count = wp.correct_count + case when p_correct then 1 else 0 end,
    wrong_count = wp.wrong_count + case when p_correct then 0 else 1 end,
    streak = case when p_correct then wp.streak + 1 else 0 end,
    first_studied_at = coalesce(wp.first_studied_at, now()),
    last_studied_at = now(),
    last_correct_at = case when p_correct then now() else wp.last_correct_at end,
    last_wrong_at = case when p_correct then wp.last_wrong_at else now() end,
    updated_at = now()
  returning * into r;

  insert into public.study_logs (user_id, word_no, correct, mode)
  values (uid, p_word_no, p_correct, p_mode);

  return r;
end;
$$;

-- 苦手リストに手動で追加／解除する
create or replace function public.set_weak(p_word_no integer, p_weak boolean)
returns public.word_progress
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.word_progress;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  insert into public.word_progress as wp (user_id, word_no, is_weak, updated_at)
  values (uid, p_word_no, p_weak, now())
  on conflict (user_id, word_no) do update set is_weak = p_weak, streak = 0, updated_at = now()
  returning * into r;
  return r;
end;
$$;

grant execute on function public.record_answer(integer, boolean, text) to authenticated;
grant execute on function public.set_weak(integer, boolean) to authenticated;
