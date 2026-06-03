-- Auto-mark past bookings as completed when end_date has passed (no manual action).

create or replace function public.auto_complete_due_bookings_for_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer := 0;
begin
  if v_uid is null then
    return 0;
  end if;

  update public.bookings b
  set
    status = 'completed',
    completed_at = coalesce(b.completed_at, timezone('utc', now()))
  where
    (b.pet_parent_id = v_uid or b.pet_friend_id = v_uid)
    and b.status not in ('cancelled', 'completed')
    and b.end_date < timezone('utc', now())::date;

  get diagnostics v_count = row_count;

  update public.requests r
  set
    status = 'completed',
    completed_at = coalesce(r.completed_at, timezone('utc', now()))
  from public.bookings b
  where
    r.id = b.request_id
    and b.status = 'completed'
    and (b.pet_parent_id = v_uid or b.pet_friend_id = v_uid)
    and r.status = 'accepted'
    and r.completed_at is null;

  return v_count;
end;
$$;

grant execute on function public.auto_complete_due_bookings_for_user() to authenticated;

notify pgrst, 'reload schema';
