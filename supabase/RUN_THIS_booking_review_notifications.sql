-- =============================================================================
-- BOOKING REVIEW NOTIFICATIONS — run in Supabase SQL Editor
-- Updates complete_booking() with role-specific review prompts
-- =============================================================================

alter table public.notifications
  add column if not exists related_booking_id uuid references public.bookings (id) on delete cascade;

create index if not exists notifications_related_booking_id_idx
  on public.notifications (related_booking_id)
  where related_booking_id is not null;

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

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    related_request_id,
    related_booking_id,
    read_at
  )
  values
    (
      v_booking.pet_parent_id,
      'booking_review_parent',
      'Leave a review',
      'Please review your Pet Friend for care of ' || v_pet_name || '.',
      v_booking.request_id,
      p_booking_id,
      null
    ),
    (
      v_booking.pet_friend_id,
      'booking_review_friend',
      'Leave a review',
      'Please review your pet care experience with ' || v_pet_name || '.',
      v_booking.request_id,
      p_booking_id,
      null
    );

end;
$$;

grant execute on function public.complete_booking(uuid) to authenticated;

notify pgrst, 'reload schema';
