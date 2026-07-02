-- Marketplace visibility: Find Care requires active Pet Friend membership;
-- Find Pets requires active Pet Parent membership (see 20260630100000 for pets RLS).

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
      and um.status = 'active'::public.membership_status
      and (
        um.end_date is null
        or um.end_date >= (timezone('utc', now()))::date
      )
  );
$$;

comment on function public.has_active_pet_friend_membership(uuid) is
  'True when user has active Pet Friend membership (Find Care listing eligibility).';

revoke all on function public.has_active_pet_friend_membership(uuid) from public;
grant execute on function public.has_active_pet_friend_membership(uuid) to anon, authenticated;

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
    and um.status = 'active'::public.membership_status
    and (
      um.end_date is null
      or um.end_date >= (timezone('utc', now()))::date
    );
$$;

revoke all on function public.user_ids_with_active_pet_friend_membership(uuid[]) from public;
grant execute on function public.user_ids_with_active_pet_friend_membership(uuid[]) to anon, authenticated;

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
    and um.status = 'active'::public.membership_status
    and (
      um.end_date is null
      or um.end_date >= (timezone('utc', now()))::date
    );
$$;

revoke all on function public.user_ids_with_active_pet_parent_membership(uuid[]) from public;
grant execute on function public.user_ids_with_active_pet_parent_membership(uuid[]) to anon, authenticated;

-- Public profiles readable only when the member has an active paid role (either slot).
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  to authenticated, anon
  using (
    id = (select auth.uid())
    or (
      is_public = true
      and (
        public.has_active_pet_friend_membership(id)
        or public.has_active_pet_parent_membership(id)
      )
    )
  );

notify pgrst, 'reload schema';
