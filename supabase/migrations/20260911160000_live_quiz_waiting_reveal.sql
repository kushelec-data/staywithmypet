-- Split auto-close from answer reveal. Host must click Reveal Answer.

do $$
declare
  conname text;
begin
  select con.conname into conname
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'live_quiz_games'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%lobby%'
    and pg_get_constraintdef(con.oid) ilike '%finished%'
  limit 1;
  if conname is not null then
    execute format('alter table public.live_quiz_games drop constraint %I', conname);
  end if;
end $$;

update public.live_quiz_games
  set status = 'question_open'
  where status = 'question';

alter table public.live_quiz_games
  add constraint live_quiz_games_status_check
  check (status in ('lobby', 'question_open', 'waiting_reveal', 'reveal', 'leaderboard', 'finished'));
