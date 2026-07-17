-- Sparse care-date overlap: compare individual requested_dates, not min/max spans.

-- Expand a request to its actual care dates.
create or replace function public.request_care_dates(p_request public.requests)
returns date[]
language plpgsql
stable
as $$
declare
  v_start date;
  v_end date;
begin
  if p_request.requested_dates is not null and cardinality(p_request.requested_dates) > 0 then
    return (
      select coalesce(array_agg(d order by d), '{}'::date[])
      from unnest(p_request.requested_dates) as d
    );
  end if;

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

  if v_start is null then
    return '{}'::date[];
  end if;

  if v_end < v_start then
    v_end := v_start;
  end if;

  return public.dates_in_range(v_start, v_end);
end;
$$;

-- Expand a booking to its actual care dates (via linked request when available).
create or replace function public.booking_care_dates(p_booking public.bookings)
returns date[]
language plpgsql
stable
as $$
declare
  v_request public.requests%rowtype;
begin
  select * into v_request from public.requests where id = p_booking.request_id;

  if v_request.id is not null
     and v_request.requested_dates is not null
     and cardinality(v_request.requested_dates) > 0 then
    return (
      select coalesce(array_agg(d order by d), '{}'::date[])
      from unnest(v_request.requested_dates) as d
    );
  end if;

  return public.dates_in_range(p_booking.start_date, p_booking.end_date);
end;
$$;

-- Primary overlap check: any shared care date with an upcoming/active booking.
create or replace function public.booking_dates_overlap(
  p_pet_id uuid,
  p_incoming_dates date[],
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
      and exists (
        select 1
        from unnest(p_incoming_dates) as incoming(d)
        inner join unnest(public.booking_care_dates(b)) as existing(d) on incoming.d = existing.d
      )
  );
$$;

-- Backward-compatible range wrapper (legacy callers).
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
  select public.booking_dates_overlap(
    p_pet_id,
    public.dates_in_range(p_start, p_end),
    p_exclude_booking_id
  );
$$;

-- Block only actual care dates on the pet calendar.
create or replace function public.block_pet_availability_for_booking(
  p_pet_id uuid,
  p_dates date[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text[];
  v_blocked_text text[];
begin
  if p_dates is null or cardinality(p_dates) = 0 then
    return;
  end if;

  select availability_dates into v_current from public.pets where id = p_pet_id;
  v_blocked_text := array(select distinct d::text from unnest(p_dates) as d order by d);

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

-- Backward-compatible range wrapper (legacy callers).
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
begin
  perform public.block_pet_availability_for_booking(
    p_pet_id,
    public.dates_in_range(p_start, p_end)
  );
end;
$$;

-- Restore only actual care dates on cancellation.
create or replace function public.restore_pet_availability_for_booking(
  p_pet_id uuid,
  p_dates date[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current text[];
  v_restore_text text[];
begin
  if p_dates is null or cardinality(p_dates) = 0 then
    return;
  end if;

  select availability_dates into v_current from public.pets where id = p_pet_id;
  v_restore_text := array(select distinct d::text from unnest(p_dates) as d order by d);

  update public.pets
  set availability_dates = (
    select coalesce(array_agg(x order by x), '{}'::text[])
    from (
      select distinct x
      from unnest(coalesce(v_current, '{}'::text[]) || v_restore_text) as x
    ) s
  )
  where id = p_pet_id;
end;
$$;

-- Backward-compatible range wrapper (legacy callers).
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
begin
  perform public.restore_pet_availability_for_booking(
    p_pet_id,
    public.dates_in_range(p_start, p_end)
  );
end;
$$;

-- Cancel restores sparse/legacy care dates via booking_care_dates.
create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_reason text default null
)
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
    cancelled_at = timezone('utc', now()),
    cancelled_reason = nullif(trim(p_reason), '')
  where id = p_booking_id;

  perform public.restore_pet_availability_for_booking(
    v_booking.pet_id,
    public.booking_care_dates(v_booking)
  );
end;
$$;

-- Accept path: overlap + availability use exact care dates; booking row still stores min/max span.
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
  v_care_dates date[];
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

  v_care_dates := public.request_care_dates(v_request);

  if v_care_dates is null or cardinality(v_care_dates) = 0 then
    raise exception 'Request is missing care dates';
  end if;

  select r.start_date, r.end_date into v_start, v_end
  from public.request_booking_dates(v_request) r;

  if public.booking_dates_overlap(v_request.pet_id, v_care_dates) then
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

  perform public.block_pet_availability_for_booking(v_request.pet_id, v_care_dates);

  return v_booking_id;
end;
$$;
