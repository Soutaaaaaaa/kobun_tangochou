-- 苦手リストは「2回連続で正解」したときだけ外す（カードの「覚えた」も正解として数える）
-- 0001〜0003 のあとに SQL Editor で実行してください。何度実行しても問題ありません。

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

grant execute on function public.record_answer(integer, boolean, text) to authenticated;

notify pgrst, 'reload schema';
