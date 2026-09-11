-- Reactions after a question is revealed. Counts table is safe for Realtime.

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

alter table public.live_quiz_games
  add constraint live_quiz_games_status_check
  check (status in ('lobby', 'question', 'reveal', 'leaderboard', 'finished'));

create table if not exists public.live_quiz_reactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_quiz_games (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  player_id uuid not null references public.live_quiz_players (id) on delete cascade,
  reaction text not null check (reaction in ('love', 'wow', 'funny', 'angry')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (player_id, question_id)
);

create table if not exists public.live_quiz_reaction_counts (
  game_id uuid not null references public.live_quiz_games (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  love integer not null default 0,
  wow integer not null default 0,
  funny integer not null default 0,
  angry integer not null default 0,
  primary key (game_id, question_id)
);

create index if not exists live_quiz_reactions_game_question_idx
  on public.live_quiz_reactions (game_id, question_id);

create or replace function public.sync_live_quiz_reaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_game uuid;
  target_question uuid;
begin
  if tg_op = 'DELETE' then
    target_game := old.game_id;
    target_question := old.question_id;
  else
    target_game := new.game_id;
    target_question := new.question_id;
  end if;

  insert into public.live_quiz_reaction_counts (game_id, question_id, love, wow, funny, angry)
  select
    target_game,
    target_question,
    count(*) filter (where reaction = 'love'),
    count(*) filter (where reaction = 'wow'),
    count(*) filter (where reaction = 'funny'),
    count(*) filter (where reaction = 'angry')
  from public.live_quiz_reactions
  where game_id = target_game and question_id = target_question
  on conflict (game_id, question_id) do update
    set love = excluded.love,
        wow = excluded.wow,
        funny = excluded.funny,
        angry = excluded.angry;

  return coalesce(new, old);
end;
$$;

drop trigger if exists live_quiz_reactions_count_sync on public.live_quiz_reactions;
create trigger live_quiz_reactions_count_sync
after insert or update or delete on public.live_quiz_reactions
for each row execute function public.sync_live_quiz_reaction_counts();

alter table public.live_quiz_reactions enable row level security;
alter table public.live_quiz_reaction_counts enable row level security;

revoke all on public.live_quiz_reactions from anon, authenticated;
revoke all on public.live_quiz_reaction_counts from anon, authenticated;

grant select on public.live_quiz_reaction_counts to anon, authenticated;
grant all on public.live_quiz_reactions to service_role;
grant all on public.live_quiz_reaction_counts to service_role;

create policy live_quiz_reaction_counts_public_read
  on public.live_quiz_reaction_counts
  for select
  to anon, authenticated
  using (true);

do $$
begin
  alter publication supabase_realtime add table public.live_quiz_reaction_counts;
exception
  when duplicate_object then null;
end $$;
