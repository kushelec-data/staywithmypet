-- Cancelled memberships remain usable until end_date (paid period not shortened on cancel).
-- Production membership_status: active | cancelled | expired (and inactive where applied).

create or replace function public.has_active_pet_parent_membership(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_memberships um
    where um.user_id = p_user_id
      and um.role = 'pet_parent'::public.membership_role
      and um.status in (
        'active'::public.membership_status,
        'cancelled'::public.membership_status
      )
      and public.membership_end_date_is_valid(um.end_date)
  );
$$;

create or replace function public.has_active_pet_friend_membership(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_memberships um
    where um.user_id = p_user_id
      and um.role = 'pet_friend'::public.membership_role
      and um.status in (
        'active'::public.membership_status,
        'cancelled'::public.membership_status
      )
      and public.membership_end_date_is_valid(um.end_date)
  );
$$;

create or replace function public.list_active_pet_parent_membership_user_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct um.user_id),
    '{}'::uuid[]
  )
  from public.user_memberships um
  where um.role = 'pet_parent'::public.membership_role
    and um.status in (
      'active'::public.membership_status,
      'cancelled'::public.membership_status
    )
    and public.membership_end_date_is_valid(um.end_date);
$$;

create or replace function public.list_active_pet_friend_membership_user_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct um.user_id),
    '{}'::uuid[]
  )
  from public.user_memberships um
  where um.role = 'pet_friend'::public.membership_role
    and um.status in (
      'active'::public.membership_status,
      'cancelled'::public.membership_status
    )
    and public.membership_end_date_is_valid(um.end_date);
$$;

create or replace function public.user_ids_with_active_pet_parent_membership(p_user_ids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct um.user_id),
    '{}'::uuid[]
  )
  from public.user_memberships um
  where um.user_id = any (p_user_ids)
    and um.role = 'pet_parent'::public.membership_role
    and um.status in (
      'active'::public.membership_status,
      'cancelled'::public.membership_status
    )
    and public.membership_end_date_is_valid(um.end_date);
$$;

create or replace function public.user_ids_with_active_pet_friend_membership(p_user_ids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    array_agg(distinct um.user_id),
    '{}'::uuid[]
  )
  from public.user_memberships um
  where um.user_id = any (p_user_ids)
    and um.role = 'pet_friend'::public.membership_role
    and um.status in (
      'active'::public.membership_status,
      'cancelled'::public.membership_status
    )
    and public.membership_end_date_is_valid(um.end_date);
$$;

notify pgrst, 'reload schema';
