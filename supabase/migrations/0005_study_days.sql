-- 日ごとの学習数（カレンダー・連続日数用）
-- 0001〜0004 のあとに SQL Editor で実行してください。何度実行しても問題ありません。

create or replace function public.study_days(p_tz text default 'Asia/Tokyo', p_user uuid default null)
returns table (day date, answers integer, wrong integer)
language sql
stable
security invoker   -- RLS がそのまま効く（本人のみ。管理者は p_user で他の人も）
set search_path = public
as $$
  select
    (l.created_at at time zone p_tz)::date as day,
    count(*)::int as answers,
    (count(*) filter (where not l.correct))::int as wrong
  from public.study_logs l
  where l.user_id = coalesce(p_user, auth.uid())
  group by 1
  order by 1;
$$;

revoke all on function public.study_days(text, uuid) from public;
grant execute on function public.study_days(text, uuid) to authenticated;

notify pgrst, 'reload schema';
