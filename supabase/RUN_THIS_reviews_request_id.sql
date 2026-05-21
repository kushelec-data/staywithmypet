-- Patch reviews table: booking_id + request_id. Run after bookings exist.

alter table public.reviews
  add column if not exists booking_id uuid references public.bookings (id) on delete cascade;

alter table public.reviews
  add column if not exists request_id uuid references public.requests (id) on delete cascade;

update public.reviews r
set request_id = b.request_id
from public.bookings b
where r.booking_id = b.id
  and r.request_id is null;

update public.reviews r
set booking_id = b.id
from public.bookings b
where r.request_id = b.request_id
  and r.booking_id is null;

create index if not exists reviews_booking_id_idx on public.reviews (booking_id);
create index if not exists reviews_request_id_idx on public.reviews (request_id);

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

notify pgrst, 'reload schema';
