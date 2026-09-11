-- Live StayWithMyPet quiz. Service-role writes; public may read game + roster only.

create table if not exists public.quizzes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'ready')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  sort_order integer not null,
  prompt text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_id text not null check (correct_id in ('a', 'b', 'c', 'd')),
  explanation text not null,
  source_label text not null,
  source_url text not null,
  timer_seconds integer not null default 15 check (timer_seconds between 5 and 120),
  unique (quiz_id, sort_order)
);

create table if not exists public.live_quiz_games (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete restrict,
  pin text not null,
  status text not null default 'lobby' check (status in ('lobby', 'question', 'reveal', 'finished')),
  current_index integer not null default 0,
  question_started_at timestamptz,
  question_closes_at timestamptz,
  round_scored boolean not null default false,
  host_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  ended_at timestamptz
);

create unique index if not exists live_quiz_games_active_pin_idx
  on public.live_quiz_games (pin)
  where status <> 'finished';

create table if not exists public.live_quiz_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_quiz_games (id) on delete cascade,
  display_name text not null,
  display_name_key text not null,
  token_hash text not null unique,
  score integer not null default 0,
  joined_at timestamptz not null default timezone('utc', now()),
  unique (game_id, display_name_key)
);

create table if not exists public.live_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.live_quiz_games (id) on delete cascade,
  player_id uuid not null references public.live_quiz_players (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  choice_id text not null check (choice_id in ('a', 'b', 'c', 'd')),
  elapsed_ms integer not null default 0,
  is_correct boolean not null,
  points integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (game_id, player_id, question_id)
);

create table if not exists public.live_quiz_roster (
  player_id uuid primary key references public.live_quiz_players (id) on delete cascade,
  game_id uuid not null references public.live_quiz_games (id) on delete cascade,
  display_name text not null,
  score integer not null default 0,
  joined_at timestamptz not null
);

create index if not exists live_quiz_roster_game_idx on public.live_quiz_roster (game_id, score desc);
create index if not exists live_quiz_players_game_idx on public.live_quiz_players (game_id);
create index if not exists live_quiz_answers_game_idx on public.live_quiz_answers (game_id, question_id);

create or replace function public.sync_live_quiz_roster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.live_quiz_roster where player_id = old.id;
    return old;
  end if;
  insert into public.live_quiz_roster (player_id, game_id, display_name, score, joined_at)
  values (new.id, new.game_id, new.display_name, new.score, new.joined_at)
  on conflict (player_id) do update
    set display_name = excluded.display_name,
        score = excluded.score;
  return new;
end;
$$;

drop trigger if exists live_quiz_players_roster_sync on public.live_quiz_players;
create trigger live_quiz_players_roster_sync
after insert or update or delete on public.live_quiz_players
for each row execute function public.sync_live_quiz_roster();

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.live_quiz_games enable row level security;
alter table public.live_quiz_players enable row level security;
alter table public.live_quiz_answers enable row level security;
alter table public.live_quiz_roster enable row level security;

revoke all on public.quizzes from anon, authenticated;
revoke all on public.quiz_questions from anon, authenticated;
revoke all on public.live_quiz_games from anon, authenticated;
revoke all on public.live_quiz_players from anon, authenticated;
revoke all on public.live_quiz_answers from anon, authenticated;
revoke all on public.live_quiz_roster from anon, authenticated;

grant select on public.live_quiz_games to anon, authenticated;
grant select on public.live_quiz_roster to anon, authenticated;

create policy live_quiz_games_public_read
  on public.live_quiz_games
  for select
  to anon, authenticated
  using (true);

create policy live_quiz_roster_public_read
  on public.live_quiz_roster
  for select
  to anon, authenticated
  using (true);

grant all on public.quizzes to service_role;
grant all on public.quiz_questions to service_role;
grant all on public.live_quiz_games to service_role;
grant all on public.live_quiz_players to service_role;
grant all on public.live_quiz_answers to service_role;
grant all on public.live_quiz_roster to service_role;

do $$
begin
  alter publication supabase_realtime add table public.live_quiz_games;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.live_quiz_roster;
exception
  when duplicate_object then null;
end $$;
