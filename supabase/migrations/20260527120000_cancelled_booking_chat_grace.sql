-- Backfill cancellation timestamps for cancelled bookings (chat grace period).
update public.bookings
set cancelled_at = coalesce(cancelled_at, timezone('utc', now()))
where status = 'cancelled'
  and cancelled_at is null;
