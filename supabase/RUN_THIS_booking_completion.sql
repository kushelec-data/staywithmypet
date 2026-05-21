-- Run in Supabase SQL Editor after bookings table exists.

alter table public.bookings
  add column if not exists cancelled_reason text;

-- notifications.type is plain text; uses 'booking_completed' (no PostgreSQL enum).

create or replace function public.complete_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_uid uuid := auth.uid();
  v_pet_name text;
  v_actor_name text;
begin
  select * into v_booking from public.bookings where id = p_booking_id;

  if v_booking.id is null then
    raise exception 'Booking not found';
  end if;

  if v_uid is distinct from v_booking.pet_parent_id and v_uid is distinct from v_booking.pet_friend_id then
    raise exception 'Not allowed';
  end if;

  if v_booking.status = 'cancelled' then
    raise exception 'Cannot complete a cancelled booking';
  end if;

  if v_booking.status = 'completed' then
    return;
  end if;

  select coalesce(nullif(trim(p.name), ''), 'your pet')
  into v_pet_name
  from public.pets p
  where p.id = v_booking.pet_id;

  select coalesce(nullif(trim(pr.display_name), ''), 'Someone')
  into v_actor_name
  from public.profiles pr
  where pr.id = v_uid;

  update public.bookings
  set
    status = 'completed',
    completed_at = timezone('utc', now())
  where id = p_booking_id;

  update public.requests
  set
    status = 'completed',
    completed_at = timezone('utc', now())
  where id = v_booking.request_id
    and status = 'accepted';

  insert into public.notifications (user_id, type, title, body, related_request_id, read_at)
  values
    (
      v_booking.pet_parent_id,
      'booking_completed',
      'Booking completed',
      v_actor_name || ' marked the care booking for ' || v_pet_name || ' as completed.',
      v_booking.request_id,
      null
    ),
    (
      v_booking.pet_friend_id,
      'booking_completed',
      'Booking completed',
      v_actor_name || ' marked the care booking for ' || v_pet_name || ' as completed.',
      v_booking.request_id,
      null
    );
end;
$$;

grant execute on function public.complete_booking(uuid) to authenticated;

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
    v_booking.start_date,
    v_booking.end_date
  );
end;
$$;

notify pgrst, 'reload schema';
