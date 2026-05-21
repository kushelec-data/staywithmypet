-- Bookings: created automatically when a care request is accepted.

create type public.booking_status as enum (
  'upcoming',
  'active',
  'completed',
  'cancelled'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
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

create index bookings_pet_id_idx on public.bookings (pet_id);
create index bookings_pet_parent_id_idx on public.bookings (pet_parent_id);
create index bookings_pet_friend_id_idx on public.bookings (pet_friend_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_dates_idx on public.bookings (pet_id, start_date, end_date);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.booking_status_for_dates(p_start date, p_end date)
returns public.booking_status
language plpgsql
immutable
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
immutable
as $$
  select coalesce(
    array_agg(d::date order by d),
    '{}'::date[]
  )
  from generate_series(p_start, p_end, interval '1 day') as g(d);
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

create or replace function public.sync_booking_status(p_booking public.bookings)
returns public.booking_status
language plpgsql
as $$
declare
  v_status public.booking_status;
begin
  if p_booking.status = 'cancelled' then
    return 'cancelled';
  end if;

  v_status := public.booking_status_for_dates(p_booking.start_date, p_booking.end_date);

  if v_status is distinct from p_booking.status then
    update public.bookings
    set
      status = v_status,
      completed_at = case
        when v_status = 'completed' and completed_at is null then timezone('utc', now())
        else completed_at
      end
    where id = p_booking.id;
  end if;

  return v_status;
end;
$$;

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

  v_start := coalesce(
    v_request.date_from,
    (v_request.starts_at at time zone 'utc')::date
  );
  v_end := coalesce(
    v_request.date_to,
    (v_request.ends_at at time zone 'utc')::date,
    v_start
  );

  if v_start is null then
    raise exception 'Request is missing care dates';
  end if;

  if v_end < v_start then
    v_end := v_start;
  end if;

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

-- Backfill bookings for already-accepted requests (skip overlaps)
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
        null;
    end;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.bookings enable row level security;

create policy "bookings_select_participant"
  on public.bookings for select
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

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

grant select, update on public.bookings to authenticated;

-- Cancel booking: restore availability (callable from app via update)
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

grant execute on function public.cancel_booking(uuid) to authenticated;
