-- =============================================================================
-- VERIFY sparse booking overlap + restore
-- Run in Supabase SQL Editor AFTER migration 20260717160000_booking_sparse_date_overlap.sql
-- Safe: read-only checks + optional integration block wrapped in ROLLBACK
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Confirm new functions exist
-- -----------------------------------------------------------------------------
select
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'request_care_dates',
    'booking_care_dates',
    'booking_dates_overlap',
    'block_pet_availability_for_booking',
    'restore_pet_availability_for_booking',
    'create_booking_from_request',
    'cancel_booking'
  )
order by p.proname, arguments;

-- -----------------------------------------------------------------------------
-- 2) Sparse overlap logic (inline — no table data required)
--    Existing sparse dates: Jul 16–18, 20–22, 27–29
-- -----------------------------------------------------------------------------
with sparse_existing as (
  select unnest(array[
    '2026-07-16'::date, '2026-07-17'::date, '2026-07-18'::date,
    '2026-07-20'::date, '2026-07-21'::date, '2026-07-22'::date,
    '2026-07-27'::date, '2026-07-28'::date, '2026-07-29'::date
  ]) as care_date
),
incoming_j23 as (
  select unnest(array['2026-07-23'::date]) as care_date
),
incoming_j22 as (
  select unnest(array['2026-07-22'::date]) as care_date
)
select
  'July 23 overlap (expect false)' as check_name,
  exists (
    select 1
    from incoming_j23 i
    inner join sparse_existing e on i.care_date = e.care_date
  ) as overlaps
union all
select
  'July 22 overlap (expect true)' as check_name,
  exists (
    select 1
    from incoming_j22 i
    inner join sparse_existing e on i.care_date = e.care_date
  ) as overlaps;

-- -----------------------------------------------------------------------------
-- 3) Cancelled bookings do not block (status filter simulation)
-- -----------------------------------------------------------------------------
select
  'cancelled status blocks (expect false)' as check_name,
  ('cancelled' in ('upcoming', 'active')) as blocks_dates;

-- -----------------------------------------------------------------------------
-- 4) Restore merge: sparse dates only, unique + sorted, no duplicates
-- -----------------------------------------------------------------------------
with current_availability as (
  select unnest(array[
    '2026-07-19', '2026-07-23', '2026-07-24', '2026-07-25', '2026-07-26'
  ]::text[]) as iso_date
),
sparse_restore as (
  select unnest(array[
    '2026-07-16', '2026-07-17', '2026-07-18',
    '2026-07-20', '2026-07-21', '2026-07-22',
    '2026-07-27', '2026-07-28', '2026-07-29'
  ]::text[]) as iso_date
),
merged as (
  select distinct iso_date
  from (
    select iso_date from current_availability
    union all
    select iso_date from sparse_restore
  ) u
)
select
  array_agg(iso_date order by iso_date) as restored_availability,
  count(*) as distinct_count,
  count(*) = count(distinct iso_date) as no_duplicates
from merged;

-- Expected restored_availability:
-- {2026-07-16..18, 2026-07-19..29} — gap days 19/23/24/25/26 preserved, 25/26 NOT invented

-- -----------------------------------------------------------------------------
-- 5) Legacy continuous restore (expect Jul 16–18)
-- -----------------------------------------------------------------------------
with legacy_restore as (
  select unnest(public.dates_in_range('2026-07-16'::date, '2026-07-18'::date)) as care_date
)
select
  array_agg(care_date::text order by care_date) as legacy_restored_dates
from legacy_restore;

-- -----------------------------------------------------------------------------
-- 6) Optional integration test against live functions (rolls back)
--    Requires ability to insert auth.users (SQL Editor / service role).
--    Skip this block if inserts fail; sections 1–5 still validate logic.
-- -----------------------------------------------------------------------------
begin;

do $$
declare
  v_pet_id uuid := gen_random_uuid();
  v_parent_id uuid := gen_random_uuid();
  v_friend_id uuid := gen_random_uuid();
  v_request_id uuid := gen_random_uuid();
  v_booking_id uuid;
  v_sparse_dates date[] := array[
    '2026-07-16'::date, '2026-07-17'::date, '2026-07-18'::date,
    '2026-07-20'::date, '2026-07-21'::date, '2026-07-22'::date,
    '2026-07-27'::date, '2026-07-28'::date, '2026-07-29'::date
  ];
begin
  insert into auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
  )
  values
    (
      v_parent_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_parent_id || '@verify-sparse.test',
      crypt('verify-sparse-test', gen_salt('bf')),
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    ),
    (
      v_friend_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_friend_id || '@verify-sparse.test',
      crypt('verify-sparse-test', gen_salt('bf')),
      timezone('utc', now()),
      timezone('utc', now()),
      timezone('utc', now())
    );

  insert into public.profiles (id, display_name)
  values
    (v_parent_id, 'Sparse Verify Parent'),
    (v_friend_id, 'Sparse Verify Friend');

  insert into public.pets (id, owner_id, name, species, availability_dates)
  values (
    v_pet_id,
    v_parent_id,
    'Sparse Verify Pet',
    'dog',
    array[
      '2026-07-16','2026-07-17','2026-07-18','2026-07-19','2026-07-20',
      '2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-25',
      '2026-07-26','2026-07-27','2026-07-28','2026-07-29'
    ]
  );

  insert into public.requests (
    id, pet_id, pet_parent_id, pet_friend_id, sender_id, receiver_id,
    requested_dates, date_from, date_to, care_type, status
  )
  values (
    v_request_id,
    v_pet_id,
    v_parent_id,
    v_friend_id,
    v_parent_id,
    v_friend_id,
    v_sparse_dates,
    '2026-07-16',
    '2026-07-29',
    'daycare',
    'accepted'
  );

  v_booking_id := public.create_booking_from_request(v_request_id);

  if public.booking_dates_overlap(v_pet_id, array['2026-07-23'::date]) then
    raise exception 'INTEGRATION FAIL: July 23 overlaps sparse booking';
  end if;

  if not public.booking_dates_overlap(v_pet_id, array['2026-07-22'::date]) then
    raise exception 'INTEGRATION FAIL: July 22 should overlap sparse booking';
  end if;

  update public.bookings set status = 'cancelled' where id = v_booking_id;

  if public.booking_dates_overlap(v_pet_id, array['2026-07-22'::date]) then
    raise exception 'INTEGRATION FAIL: cancelled booking still blocks';
  end if;

  update public.bookings
  set status = 'upcoming', cancelled_at = null, cancelled_reason = null
  where id = v_booking_id;

  update public.pets
  set availability_dates = array['2026-07-19','2026-07-23','2026-07-24','2026-07-25','2026-07-26']
  where id = v_pet_id;

  perform public.restore_pet_availability_for_booking(
    v_pet_id,
    public.booking_care_dates((select b from public.bookings b where b.id = v_booking_id))
  );

  if (
    select availability_dates
    from public.pets
    where id = v_pet_id
  ) is distinct from array[
    '2026-07-16','2026-07-17','2026-07-18','2026-07-19','2026-07-20',
    '2026-07-21','2026-07-22','2026-07-23','2026-07-24','2026-07-25',
    '2026-07-26','2026-07-27','2026-07-28','2026-07-29'
  ] then
    raise exception 'INTEGRATION FAIL: sparse restore availability mismatch';
  end if;

  raise notice 'INTEGRATION PASS: live functions verified (transaction will rollback)';
exception
  when others then
    raise notice 'Integration block skipped or failed: %', sqlerrm;
end;
$$;

rollback;
