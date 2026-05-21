-- =============================================================================
-- BOOKINGS — run this entire file in Supabase Dashboard → SQL Editor → Run
-- Prerequisites: public.requests, public.pets, public.profiles must exist.
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
-- =============================================================================

-- 1) Enum
do $$ begin
  create type public.booking_status as enum (
    'upcoming',
    'active',
    'completed',
    'cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- 2) Table
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete restrict,
  pet_parent_id uuid not null references public.profiles (id) on delete cascade,
  pet_friend_id uuid not null references public.profiles (id) on delete cascade,
  status public.booking_status not null default 'upcoming',
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint bookings_date_range check (end_date >= start_date),
  constraint bookings_distinct_participants check (pet_parent_id <> pet_friend_id)
);

-- One booking per accepted request
create unique index if not exists bookings_request_id_unique on public.bookings (request_id);

create index if not exists bookings_pet_id_idx on public.bookings (pet_id);
create index if not exists bookings_pet_parent_id_idx on public.bookings (pet_parent_id);
create index if not exists bookings_pet_friend_id_idx on public.bookings (pet_friend_id);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_dates_idx on public.bookings (pet_id, start_date, end_date);

-- 3) Helpers
create or replace function public.booking_status_for_dates(p_start date, p_end date)
returns public.booking_status
language plpgsql
stable
as $$
declare
  v_today date := timezone('utc', now())::date;
begin
  if p_end < v_today then
    return 'completed';
  end if;
  if p_start > v_today then
    return 'upcoming';
  end if;
  return 'active';
end;
$$;

create or replace function public.booking_dates_overlap(
  p_pet_id uuid,
  p_start date,
  p_end date,
  p_exclude_booking_id uuid default null
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.bookings b
    where b.pet_id = p_pet_id
      and b.status in ('upcoming', 'active')
      and (p_exclude_booking_id is null or b.id <> p_exclude_booking_id)
      and daterange(b.start_date, b.end_date, '[]') && daterange(p_start, p_end, '[]')
  );
$$;

create or replace function public.dates_in_range(p_start date, p_end date)
returns date[]
language sql
stable
as $$
  select coalesce(array_agg(d::date order by d), '{}'::date[])
  from generate_series(p_start, p_end, interval '1 day') as g(d);
$$;

create or replace function public.request_booking_dates(p_request public.requests)
returns table (start_date date, end_date date)
language plpgsql
stable
as $$
declare
  v_start date;
  v_end date;
begin
  if p_request.requested_dates is not null and cardinality(p_request.requested_dates) > 0 then
    select min(d), max(d) into v_start, v_end from unnest(p_request.requested_dates) as d;
  else
    v_start := p_request.date_from;
    v_end := coalesce(p_request.date_to, p_request.date_from);
    if v_start is null and p_request.starts_at is not null then
      v_start := (p_request.starts_at at time zone 'utc')::date;
    end if;
    if v_end is null and p_request.ends_at is not null then
      v_end := (p_request.ends_at at time zone 'utc')::date;
    end if;
    if v_end is null then
      v_end := v_start;
    end if;
  end if;

  if v_start is null then
    raise exception 'Request is missing care dates';
  end if;

  if v_end < v_start then
    v_end := v_start;
  end if;

  return query select v_start, v_end;
end;
$$;

create or replace function public.block_pet_availability_for_booking(
  p_pet_id uuid,
  p_start date,
  p_end date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text[];
  v_blocked date[];
  v_blocked_text text[];
begin
  select availability_dates into v_current from public.pets where id = p_pet_id;
  v_blocked := public.dates_in_range(p_start, p_end);
  v_blocked_text := array(select d::text from unnest(v_blocked) as d);

  update public.pets
  set availability_dates = array(
    select x
    from unnest(coalesce(v_current, '{}'::text[])) as x
    where x not in (select unnest(v_blocked_text))
    order by x
  )
  where id = p_pet_id;
end;
$$;

create or replace function public.restore_pet_availability_for_booking(
  p_pet_id uuid,
  p_start date,
  p_end date
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text[];
  v_restore text[];
begin
  select availability_dates into v_current from public.pets where id = p_pet_id;
  v_restore := array(select d::text from unnest(public.dates_in_range(p_start, p_end)) as d);

  update public.pets
  set availability_dates = (
    select coalesce(array_agg(x order by x), '{}'::text[])
    from (
      select distinct unnest(coalesce(v_current, '{}'::text[]) || v_restore) as x
    ) s
  )
  where id = p_pet_id;
end;
$$;

-- 4) Create booking from accepted request (security definer — bypasses RLS on insert)
create or replace function public.create_booking_from_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_booking_id uuid;
  v_start date;
  v_end date;
  v_status public.booking_status;
begin
  select * into v_request from public.requests where id = p_request_id;

  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  if v_request.status <> 'accepted' then
    raise exception 'Request must be accepted to create a booking';
  end if;

  if exists (select 1 from public.bookings where request_id = p_request_id) then
    select id into v_booking_id from public.bookings where request_id = p_request_id;
    return v_booking_id;
  end if;

  select r.start_date, r.end_date into v_start, v_end
  from public.request_booking_dates(v_request) r;

  if public.booking_dates_overlap(v_request.pet_id, v_start, v_end) then
    raise exception 'These dates overlap with an existing booking for this pet';
  end if;

  v_status := public.booking_status_for_dates(v_start, v_end);

  insert into public.bookings (
    request_id,
    pet_id,
    pet_parent_id,
    pet_friend_id,
    status,
    start_date,
    end_date,
    completed_at
  )
  values (
    v_request.id,
    v_request.pet_id,
    v_request.pet_parent_id,
    v_request.pet_friend_id,
    v_status,
    v_start,
    v_end,
    case when v_status = 'completed' then timezone('utc', now()) else null end
  )
  returning id into v_booking_id;

  perform public.block_pet_availability_for_booking(v_request.pet_id, v_start, v_end);

  return v_booking_id;
end;
$$;

-- 5) Auto-create booking when request is accepted
create or replace function public.on_request_accepted_create_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
    perform public.create_booking_from_request(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists requests_accepted_create_booking on public.requests;

create trigger requests_accepted_create_booking
after update of status on public.requests
for each row
execute function public.on_request_accepted_create_booking();

-- 6) Cancel booking (RPC used by app)
create or replace function public.cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_uid uuid := auth.uid();
begin
  select * into v_booking from public.bookings where id = p_booking_id;

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_uid is distinct from v_booking.pet_parent_id and v_uid is distinct from v_booking.pet_friend_id then
    raise exception 'Not allowed';
  end if;

  if v_booking.status = 'cancelled' then
    return;
  end if;

  update public.bookings
  set
    status = 'cancelled',
    cancelled_at = timezone('utc', now())
  where id = p_booking_id;

  perform public.restore_pet_availability_for_booking(
    v_booking.pet_id,
    v_booking.start_date,
    v_booking.end_date
  );
end;
$$;

-- 7) RLS — participants read/update their bookings (insert only via trigger/RPC)
alter table public.bookings enable row level security;

drop policy if exists "bookings_select_participant" on public.bookings;
create policy "bookings_select_participant"
  on public.bookings for select
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

drop policy if exists "bookings_update_participant" on public.bookings;
create policy "bookings_update_participant"
  on public.bookings for update
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  )
  with check (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

-- No INSERT policy for authenticated: bookings are created by trigger on accept only.

grant select, update on public.bookings to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;

-- 8) Backfill bookings for requests already accepted
do $$
declare
  r record;
begin
  for r in
    select req.id
    from public.requests req
    where req.status = 'accepted'
      and not exists (select 1 from public.bookings b where b.request_id = req.id)
    order by req.created_at
  loop
    begin
      perform public.create_booking_from_request(r.id);
    exception
      when others then
        raise notice 'Skipped booking for request %: %', r.id, sqlerrm;
    end;
  end loop;
end $$;

-- 9) Reload PostgREST schema cache (Supabase API)
notify pgrst, 'reload schema';

-- =============================================================================
-- Verify (optional — should return one row after you accept a request):
--   select * from public.bookings limit 5;
-- App query matches:
--   select * from bookings
--   where pet_parent_id = auth.uid() or pet_friend_id = auth.uid();
-- =============================================================================
