-- Run in Supabase SQL editor when care request inserts fail after Terms acceptance saves.
-- Fixes legacy NOT NULL columns, direction columns, RLS (no recursion), and grants.
-- Idempotent: safe to run multiple times.
-- See also: supabase/migrations/20260625100000_requests_rls_no_recursion.sql

-- ---------------------------------------------------------------------------
-- Direction columns (sender_id / receiver_id)
-- ---------------------------------------------------------------------------

alter table public.requests
  add column if not exists sender_id uuid references public.profiles (id) on delete cascade;

alter table public.requests
  add column if not exists receiver_id uuid references public.profiles (id) on delete cascade;

alter table public.requests
  add column if not exists care_type text;

alter table public.requests
  add column if not exists date_from date;

alter table public.requests
  add column if not exists date_to date;

alter table public.requests
  add column if not exists requested_dates date[] not null default '{}';

-- Backfill sender/receiver from legacy columns when present
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'requester_id'
  ) then
    execute $sql$
      update public.requests
      set sender_id = coalesce(sender_id, requester_id)
      where sender_id is null and requester_id is not null
    $sql$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'requests' and column_name = 'initiated_by_id'
  ) then
    execute $sql$
      update public.requests r
      set
        sender_id = coalesce(r.sender_id, r.initiated_by_id),
        receiver_id = coalesce(
          r.receiver_id,
          case
            when r.initiated_by_id = r.pet_parent_id then r.pet_friend_id
            else r.pet_parent_id
          end
        )
      where r.initiated_by_id is not null
        and (r.sender_id is null or r.receiver_id is null)
    $sql$;
  end if;
end $$;

update public.requests r
set
  sender_id = coalesce(r.sender_id, r.pet_parent_id),
  receiver_id = coalesce(r.receiver_id, r.pet_friend_id)
where r.sender_id is null or r.receiver_id is null;

-- Relax legacy NOT NULL constraints so inserts only need sender_id/receiver_id
do $$
declare
  col text;
begin
  foreach col in array array['requester_id', 'owner_id', 'initiated_by_id'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'requests'
        and column_name = col
        and is_nullable = 'NO'
    ) then
      execute format(
        'alter table public.requests alter column %I drop not null',
        col
      );
    end if;
  end loop;
end $$;

-- Validate direction on insert (replaces dropped legacy participant triggers)
create or replace function public.requests_require_direction()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id is null or new.receiver_id is null then
    raise exception 'sender_id and receiver_id are required';
  end if;
  return new;
end;
$$;

drop trigger if exists requests_set_participants on public.requests;
drop trigger if exists requests_set_pet_parent on public.requests;
drop trigger if exists requests_set_direction on public.requests;
drop trigger if exists requests_sync_legacy_direction on public.requests;

drop trigger if exists requests_require_direction on public.requests;
create trigger requests_require_direction
before insert on public.requests
for each row execute function public.requests_require_direction();

alter table public.requests
  drop constraint if exists requests_distinct_direction;

alter table public.requests
  add constraint requests_distinct_direction check (sender_id <> receiver_id);

create index if not exists requests_sender_id_idx on public.requests (sender_id);
create index if not exists requests_receiver_id_idx on public.requests (receiver_id);

-- ---------------------------------------------------------------------------
-- Helper: pet active + owned by parent (bypasses pets RLS recursion)
-- ---------------------------------------------------------------------------

create or replace function public.request_pet_owned_by_parent(
  p_pet_id uuid,
  p_parent_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.is_active = true
      and p.owner_id = p_parent_id
  );
$$;

grant execute on function public.request_pet_owned_by_parent(uuid, uuid) to authenticated;

-- Block check helper (from trust & safety; no-op if table missing)
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

-- ---------------------------------------------------------------------------
-- RLS: non-recursive policies with sender/receiver direction
-- ---------------------------------------------------------------------------

alter table public.requests enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'requests'
  loop
    execute format('drop policy if exists %I on public.requests', pol.policyname);
  end loop;
end $$;

create policy "requests_select_participant"
  on public.requests for select
  to authenticated
  using (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

create policy "requests_insert_sender"
  on public.requests for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and receiver_id is not null
    and receiver_id <> (select auth.uid())
    and pet_parent_id <> pet_friend_id
    and not public.users_are_blocked((select auth.uid()), receiver_id)
    and (
      (pet_parent_id = (select auth.uid()) and pet_friend_id = receiver_id)
      or (pet_friend_id = (select auth.uid()) and pet_parent_id = receiver_id)
    )
    and (
      pet_id is null
      or public.request_pet_owned_by_parent(pet_id, pet_parent_id)
    )
  );

create policy "requests_update_receiver_respond"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and receiver_id = (select auth.uid())
  )
  with check (
    receiver_id = (select auth.uid())
    and status in ('accepted', 'declined')
  );

create policy "requests_update_sender_cancel"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and sender_id = (select auth.uid())
  )
  with check (
    sender_id = (select auth.uid())
    and status = 'cancelled'
  );

-- ---------------------------------------------------------------------------
-- Grants (new tables are not covered by older blanket grants)
-- ---------------------------------------------------------------------------

grant select, insert, update on public.requests to authenticated;
grant all on public.requests to service_role;

notify pgrst, 'reload schema';
