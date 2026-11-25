-- 古文単語315 おまけ（番号のない慣用句・言い換えなど）を追加：学習記録の単語番号の範囲を広げる
--   古文単語400 … 1〜400
--   古文単語315 … 10010〜13159
--   315 おまけ  … 20000 + 通し番号 → 20001〜20999
alter table public.word_progress drop constraint if exists word_progress_word_no_check;
alter table public.word_progress
  add constraint word_progress_word_no_check
  check (word_no between 1 and 400 or word_no between 10010 and 13159 or word_no between 20001 and 20999);

alter table public.study_logs drop constraint if exists study_logs_word_no_check;
alter table public.study_logs
  add constraint study_logs_word_no_check
  check (word_no between 1 and 400 or word_no between 10010 and 13159 or word_no between 20001 and 20999);

notify pgrst, 'reload schema';
