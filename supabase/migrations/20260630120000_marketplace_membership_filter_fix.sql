-- Fix marketplace membership filtering: app-layer intersection + list RPCs.
-- Revert RLS membership gates (they hid all rows when RPC/schema drifted).

create or replace function public.membership_end_date_is_valid(p_end_date date)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_end_date is null
    or p_end_date >= (timezone('utc', now()))::date;
$$;

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
      and um.status = 'active'::public.membership_status
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
      and um.status = 'active'::public.membership_status
      and public.membership_end_date_is_valid(um.end_date)
  );
$$;

revoke all on function public.has_active_pet_parent_membership(uuid) from public;
grant execute on function public.has_active_pet_parent_membership(uuid) to anon, authenticated;

revoke all on function public.has_active_pet_friend_membership(uuid) from public;
grant execute on function public.has_active_pet_friend_membership(uuid) to anon, authenticated;

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
    and um.status = 'active'::public.membership_status
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
    and um.status = 'active'::public.membership_status
    and public.membership_end_date_is_valid(um.end_date);
$$;

revoke all on function public.list_active_pet_parent_membership_user_ids() from public;
grant execute on function public.list_active_pet_parent_membership_user_ids() to anon, authenticated;

revoke all on function public.list_active_pet_friend_membership_user_ids() from public;
grant execute on function public.list_active_pet_friend_membership_user_ids() to anon, authenticated;

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
    and um.status = 'active'::public.membership_status
    and public.membership_end_date_is_valid(um.end_date);
$$;

revoke all on function public.user_ids_with_active_pet_parent_membership(uuid[]) from public;
grant execute on function public.user_ids_with_active_pet_parent_membership(uuid[]) to anon, authenticated;

revoke all on function public.user_ids_with_active_pet_friend_membership(uuid[]) from public;
grant execute on function public.user_ids_with_active_pet_friend_membership(uuid[]) to anon, authenticated;

-- pets: public listing uses pet flags + public owner profile (membership filtered in app)
drop policy if exists "pets_select_active" on public.pets;
create policy "pets_select_active"
  on public.pets for select
  to authenticated, anon
  using (
    owner_id = (select auth.uid())
    or (
      is_public = true
      and is_active = true
      and exists (
        select 1 from public.profiles pr
        where pr.id = owner_id
          and pr.is_public = true
      )
    )
  );

drop policy if exists "pet_photos_select" on public.pet_photos;
create policy "pet_photos_select"
  on public.pet_photos for select
  to authenticated, anon
  using (
    exists (
      select 1
      from public.pets p
      where p.id = pet_id
        and (
          p.owner_id = (select auth.uid())
          or (
            pet_photos.is_approved = true
            and p.is_public = true
            and p.is_active = true
            and exists (
              select 1
              from public.profiles pr
              where pr.id = p.owner_id
                and pr.is_public = true
            )
          )
        )
    )
  );

drop policy if exists "pet_photos_storage_select" on storage.objects;
create policy "pet_photos_storage_select"
  on storage.objects for select
  to public
  using (
    bucket_id = 'pet-photos'
    and exists (
      select 1
      from public.pet_photos pp
      join public.pets p on p.id = pp.pet_id
      join public.profiles pr on pr.id = p.owner_id
      where pp.storage_path = name
        and pp.is_approved = true
        and p.is_public = true
        and p.is_active = true
        and pr.is_public = true
    )
  );

-- profiles: public readability without role/membership (Find Care filtered in app)
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  to authenticated, anon
  using (
    is_public = true
    or id = (select auth.uid())
  );

notify pgrst, 'reload schema';
