-- ログイン中のユーザー（authenticated ロール）がテーブルと関数を使えるようにする。
-- 新しい Supabase プロジェクトでは、SQL で作ったテーブルに自動で権限が付かないことがあるため明示する。
-- 何度実行しても問題ありません。

grant usage on schema public to authenticated;

grant select on public.profiles to authenticated;
grant select, insert, update on public.word_progress to authenticated;
grant select, insert on public.study_logs to authenticated;

grant execute on function public.record_answer(integer, boolean, text) to authenticated;
grant execute on function public.set_weak(integer, boolean) to authenticated;

-- Data API のスキーマ情報を再読み込み
notify pgrst, 'reload schema';
