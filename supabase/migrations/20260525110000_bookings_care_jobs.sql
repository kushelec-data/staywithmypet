-- Care jobs: dates from request.requested_dates when present; overlap uses requested range.

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
