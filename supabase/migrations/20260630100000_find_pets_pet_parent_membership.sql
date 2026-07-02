-- Find Pets: list pets only when owner has active Pet Parent membership (user_memberships).

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
      and (
        um.end_date is null
        or um.end_date >= (timezone('utc', now()))::date
      )
  );
$$;

comment on function public.has_active_pet_parent_membership(uuid) is
  'True when user has active Pet Parent membership (Find Pets listing eligibility).';

revoke all on function public.has_active_pet_parent_membership(uuid) from public;
grant execute on function public.has_active_pet_parent_membership(uuid) to anon, authenticated;

-- pets: public marketplace rows require active Pet Parent membership on owner
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
      and public.has_active_pet_parent_membership(owner_id)
    )
  );

-- pet_photos: same eligibility as listed pets
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
            and public.has_active_pet_parent_membership(p.owner_id)
          )
        )
    )
  );

-- pet-photos storage: public read only for listed pets with eligible owner
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
        and public.has_active_pet_parent_membership(p.owner_id)
    )
  );

notify pgrst, 'reload schema';
