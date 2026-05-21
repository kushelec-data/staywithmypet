-- =============================================================================
-- TRUST & SAFETY — run in Supabase Dashboard → SQL Editor → Run
-- Creates: reports, blocked_users; blocks requests/messages between blocked users
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / CREATE OR REPLACE)
-- =============================================================================

create or replace function public.users_are_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocked_users b
    where (b.blocker_id = user_a and b.blocked_user_id = user_b)
       or (b.blocker_id = user_b and b.blocked_user_id = user_a)
  );
$$;

grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'dismissed')),
  created_at timestamptz not null default timezone('utc', now()),
  constraint reports_no_self check (reporter_id <> reported_user_id),
  constraint reports_reason_not_empty check (char_length(trim(reason)) > 0)
);

create index if not exists reports_reporter_id_idx on public.reports (reporter_id);
create index if not exists reports_reported_user_id_idx on public.reports (reported_user_id);
create index if not exists reports_status_idx on public.reports (status);

create table if not exists public.blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint blocked_users_no_self check (blocker_id <> blocked_user_id),
  constraint blocked_users_unique_pair unique (blocker_id, blocked_user_id)
);

create index if not exists blocked_users_blocker_id_idx on public.blocked_users (blocker_id);
create index if not exists blocked_users_blocked_user_id_idx on public.blocked_users (blocked_user_id);

alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;

drop policy if exists reports_select_own on public.reports;
drop policy if exists reports_insert_own on public.reports;

create policy reports_select_own
  on public.reports for select
  to authenticated
  using (reporter_id = (select auth.uid()));

create policy reports_insert_own
  on public.reports for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and reported_user_id <> (select auth.uid())
  );

drop policy if exists blocked_users_select_own on public.blocked_users;
drop policy if exists blocked_users_insert_own on public.blocked_users;
drop policy if exists blocked_users_delete_own on public.blocked_users;

create policy blocked_users_select_own
  on public.blocked_users for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy blocked_users_insert_own
  on public.blocked_users for insert
  to authenticated
  with check (
    blocker_id = (select auth.uid())
    and blocked_user_id <> (select auth.uid())
  );

create policy blocked_users_delete_own
  on public.blocked_users for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

grant select, insert on public.reports to authenticated;
grant select, insert, delete on public.blocked_users to authenticated;

drop policy if exists requests_insert_sender on public.requests;

create policy requests_insert_sender
  on public.requests for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and receiver_id <> (select auth.uid())
    and pet_parent_id <> pet_friend_id
    and not public.users_are_blocked((select auth.uid()), receiver_id)
    and (
      (pet_parent_id = (select auth.uid()) and pet_friend_id = receiver_id)
      or (pet_friend_id = (select auth.uid()) and pet_parent_id = receiver_id)
    )
    and (
      pet_id is null
      or exists (
        select 1
        from public.pets p
        where p.id = pet_id
          and p.is_active = true
          and p.owner_id = pet_parent_id
      )
    )
  );

drop policy if exists messages_insert_participant on public.messages;

create policy messages_insert_participant
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
    and not exists (
      select 1
      from public.conversations c
      join public.requests r on r.id = c.request_id
      where c.id = conversation_id
        and public.users_are_blocked(
          (select auth.uid()),
          case
            when r.pet_parent_id = (select auth.uid()) then r.pet_friend_id
            else r.pet_parent_id
          end
        )
    )
  );

notify pgrst, 'reload schema';
