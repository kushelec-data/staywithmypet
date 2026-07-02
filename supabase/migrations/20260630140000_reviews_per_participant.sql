-- Allow one review per participant per booking (Pet Parent + Pet Friend).
-- Drops legacy request_id-only uniqueness that blocked the second review.

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
  v_normalized text;
begin
  if p_tags is null or coalesce(array_length(p_tags, 1), 0) = 0 then
    return true;
  end if;

  if p_review_type = 'pet_parent_reviews_pet_friend' then
    v_allowed := array[
      'reliable', 'friendly', 'good_communication', 'sent_updates', 'on_time', 'caring', 'followed_instructions',
      'Reliable', 'Friendly', 'Good communication', 'Sent updates', 'On time', 'Caring', 'Followed instructions'
    ];
  else
    v_allowed := array[
      'calm', 'friendly', 'easy_to_care_for', 'energetic', 'shy', 'needs_medication', 'good_on_walks',
      'Calm', 'Friendly', 'Easy to care for', 'Energetic', 'Shy', 'Needs medication', 'Good on walks',
      'Easy walks'
    ];
  end if;

  foreach v_tag in array p_tags loop
    v_normalized := trim(v_tag);
    if not (v_normalized = any (v_allowed)) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

notify pgrst, 'reload schema';
