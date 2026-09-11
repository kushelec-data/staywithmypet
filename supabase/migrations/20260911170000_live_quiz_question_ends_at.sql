-- Server-authoritative question window. Host/player clocks use question_ends_at.

alter table public.live_quiz_games
  add column if not exists question_ends_at timestamptz;

update public.live_quiz_games
  set question_ends_at = question_closes_at
  where question_ends_at is null and question_closes_at is not null;
