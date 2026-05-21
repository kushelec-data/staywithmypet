-- =============================================================================
-- REVIEWS — run in Supabase Dashboard → SQL Editor → Run
-- Prerequisites: public.bookings, public.profiles, public.pets
-- Safe to re-run (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS)
-- =============================================================================

do $$ begin
  create type public.review_type as enum (
    'pet_parent_reviews_pet_friend',
    'pet_friend_reviews_pet'
  );
exception
  when duplicate_object then null;
end $$;

drop policy if exists reviews_select_all on public.reviews;
drop policy if exists reviews_insert_participant on public.reviews;
drop policy if exists reviews_insert_own on public.reviews;
drop policy if exists reviews_update_own on public.reviews;

drop trigger if exists reviews_validate_insert on public.reviews;
drop trigger if exists reviews_after_change_sync_rating on public.reviews;
drop trigger if exists reviews_set_updated_at on public.reviews;

drop table if exists public.reviews cascade;

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  request_id uuid references public.requests (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  text text check (text is null or char_length(text) <= 500),
  tags text[] not null default '{}'::text[],
  review_type public.review_type not null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint reviews_distinct_participants check (reviewer_id <> reviewee_id),
  constraint reviews_one_per_reviewer_per_booking unique (booking_id, reviewer_id)
);

create index if not exists reviews_booking_id_idx on public.reviews (booking_id);
create index if not exists reviews_request_id_idx on public.reviews (request_id);
create index if not exists reviews_reviewee_id_idx on public.reviews (reviewee_id);
create index if not exists reviews_reviewer_id_idx on public.reviews (reviewer_id);
create index if not exists reviews_pet_id_idx on public.reviews (pet_id);
create index if not exists reviews_review_type_idx on public.reviews (review_type);

create or replace function public.booking_is_reviewable(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and b.status <> 'cancelled'
      and (
        b.status = 'completed'
        or b.end_date < timezone('utc', now())::date
      )
  );
$$;

create or replace function public.validate_review_tags(
  p_review_type public.review_type,
  p_tags text[]
)
returns boolean
language plpgsql
immutable
as $$
declare
  v_allowed text[];
  v_tag text;
begin
  if p_tags is null or coalesce(array_length(p_tags, 1), 0) = 0 then
    return true;
  end if;

  if p_review_type = 'pet_parent_reviews_pet_friend' then
    v_allowed := array[
      'Reliable', 'Friendly', 'Good communication', 'On time', 'Caring'
    ];
  else
    v_allowed := array[
      'Calm', 'Energetic', 'Easy walks', 'Friendly', 'Needs medication', 'Shy'
    ];
  end if;

  foreach v_tag in array p_tags loop
    if not (v_tag = any (v_allowed)) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.validate_review_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
begin
  if new.booking_id is null then
    raise exception 'booking_id is required';
  end if;

  if not public.booking_is_reviewable(new.booking_id) then
    raise exception 'Reviews are only allowed after a booking is completed';
  end if;

  select * into v_booking from public.bookings where id = new.booking_id;
  if not found then
    raise exception 'Booking not found';
  end if;

  if new.request_id is null then
    new.request_id := v_booking.request_id;
  elsif new.request_id is distinct from v_booking.request_id then
    raise exception 'request_id does not match booking';
  end if;

  if new.pet_id <> v_booking.pet_id then
    raise exception 'Pet does not match booking';
  end if;

  if new.reviewer_id <> (select auth.uid()) then
    raise exception 'Reviewer must be the signed-in user';
  end if;

  if not public.validate_review_tags(new.review_type, new.tags) then
    raise exception 'Invalid review tags for this review type';
  end if;

  if new.review_type = 'pet_parent_reviews_pet_friend' then
    if new.reviewer_id <> v_booking.pet_parent_id
      or new.reviewee_id <> v_booking.pet_friend_id then
      raise exception 'Invalid participants for pet parent review';
    end if;
  elsif new.review_type = 'pet_friend_reviews_pet' then
    if new.reviewer_id <> v_booking.pet_friend_id
      or new.reviewee_id <> v_booking.pet_parent_id then
      raise exception 'Invalid participants for pet experience review';
    end if;
  else
    raise exception 'Unknown review type';
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_validate_insert on public.reviews;
create trigger reviews_validate_insert
before insert on public.reviews
for each row execute function public.validate_review_insert();

create or replace function public.sync_profile_rating_for_reviewee(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_avg numeric(3, 2);
begin
  select count(*)::integer, coalesce(round(avg(rating)::numeric, 2), 0)
  into v_count, v_avg
  from public.reviews
  where reviewee_id = p_profile_id
    and review_type = 'pet_parent_reviews_pet_friend';

  update public.profiles
  set rating_count = v_count,
      rating_avg = v_avg
  where id = p_profile_id;
end;
$$;

create or replace function public.reviews_sync_profile_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewee uuid;
  v_type public.review_type;
begin
  if TG_OP = 'DELETE' then
    v_reviewee := OLD.reviewee_id;
    v_type := OLD.review_type;
  else
    v_reviewee := NEW.reviewee_id;
    v_type := NEW.review_type;
  end if;

  if v_type = 'pet_parent_reviews_pet_friend' then
    perform public.sync_profile_rating_for_reviewee(v_reviewee);
  end if;

  if TG_OP = 'UPDATE' and OLD.reviewee_id is distinct from NEW.reviewee_id
    and OLD.review_type = 'pet_parent_reviews_pet_friend' then
    perform public.sync_profile_rating_for_reviewee(OLD.reviewee_id);
  end if;

  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists reviews_after_change_sync_rating on public.reviews;
create trigger reviews_after_change_sync_rating
after insert or update or delete on public.reviews
for each row execute function public.reviews_sync_profile_rating();

alter table public.reviews enable row level security;

drop policy if exists reviews_select_all on public.reviews;
create policy "reviews_select_all"
  on public.reviews for select
  to authenticated, anon
  using (true);

drop policy if exists reviews_insert_own on public.reviews;
create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated
  with check (reviewer_id = (select auth.uid()));

notify pgrst, 'reload schema';
