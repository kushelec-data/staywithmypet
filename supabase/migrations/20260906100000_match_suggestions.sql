-- Weekly matchmaking recommendations (Pet Parent ↔ Pet Friend for a listed pet).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'match_suggestion_status') then
    create type public.match_suggestion_status as enum (
      'active',
      'viewed',
      'dismissed',
      'expired'
    );
  end if;
end $$;

create table if not exists public.match_suggestions (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  pet_parent_id uuid not null references public.profiles (id) on delete cascade,
  pet_friend_id uuid not null references public.profiles (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  score numeric(5, 2) not null check (score >= 0 and score <= 100),
  reasons jsonb not null default '[]'::jsonb,
  status public.match_suggestion_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  viewed_at timestamptz,
  emailed_at timestamptz,
  clicked_at timestamptz,
  constraint match_suggestions_distinct_users check (pet_parent_id <> pet_friend_id)
);

create index match_suggestions_parent_created_idx
  on public.match_suggestions (pet_parent_id, created_at desc);

create index match_suggestions_friend_created_idx
  on public.match_suggestions (pet_friend_id, created_at desc);

create index match_suggestions_pet_idx
  on public.match_suggestions (pet_id);

create index match_suggestions_batch_idx
  on public.match_suggestions (batch_id);

create index match_suggestions_pair_cooldown_idx
  on public.match_suggestions (pet_parent_id, pet_friend_id, pet_id, created_at desc);

create index match_suggestions_active_expires_idx
  on public.match_suggestions (expires_at)
  where status in ('active', 'viewed');

alter table public.match_suggestions enable row level security;

create policy "match_suggestions_select_own"
  on public.match_suggestions for select
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

create policy "match_suggestions_update_own"
  on public.match_suggestions for update
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  )
  with check (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

grant select, update on public.match_suggestions to authenticated;
