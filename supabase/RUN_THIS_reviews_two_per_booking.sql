-- Run in Supabase SQL Editor if the second participant cannot submit a review.
-- Fixes legacy unique(request_id) and ensures unique(booking_id, reviewer_id).

alter table public.reviews drop constraint if exists reviews_request_id_key;

do $$
declare
  v_constraint name;
begin
  for v_constraint in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'reviews'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) ~* 'unique\s*\(\s*request_id\s*\)'
  loop
    execute format('alter table public.reviews drop constraint if exists %I', v_constraint);
  end loop;
end $$;

alter table public.reviews drop constraint if exists reviews_one_per_reviewer_per_booking;

alter table public.reviews
  add constraint reviews_one_per_reviewer_per_booking unique (booking_id, reviewer_id);

notify pgrst, 'reload schema';
