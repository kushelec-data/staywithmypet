-- Public beta security: RLS tightening, storage limits, membership writes

-- ---------------------------------------------------------------------------
-- Profiles: participant reads for request/messaging UI (limited columns in app)
-- Replaces broad policy; sensitive fields must not be selected client-side.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_request_participant" on public.profiles;

create policy "profiles_select_request_participant"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.requests r
      where (
        r.sender_id = profiles.id
        or r.receiver_id = profiles.id
        or r.pet_parent_id = profiles.id
        or r.pet_friend_id = profiles.id
      )
      and (
        r.sender_id = (select auth.uid())
        or r.receiver_id = (select auth.uid())
        or r.pet_parent_id = (select auth.uid())
        or r.pet_friend_id = (select auth.uid())
      )
    )
  );

-- Own row always readable (full profile for account settings)
drop policy if exists "profiles_select_public" on public.profiles;

create policy "profiles_select_public"
  on public.profiles for select
  to authenticated, anon
  using (
    is_public = true
    or id = (select auth.uid())
  );

-- ---------------------------------------------------------------------------
-- user_memberships: read own row only; writes via service role (Stripe webhook)
-- ---------------------------------------------------------------------------

drop policy if exists user_memberships_insert_own on public.user_memberships;
drop policy if exists user_memberships_update_own on public.user_memberships;

-- ---------------------------------------------------------------------------
-- pet_photos: public read only approved media on listed pets
-- ---------------------------------------------------------------------------

alter table public.pet_photos
  add column if not exists is_approved boolean not null default true;

comment on column public.pet_photos.is_approved is
  'When false, hidden from public pet pages and anonymous storage reads.';

update public.pet_photos
set is_approved = true
where is_approved is distinct from true;

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

-- ---------------------------------------------------------------------------
-- Storage: 3 MB, images only; pet-photos public read when approved + listed
-- ---------------------------------------------------------------------------

update storage.buckets
set
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('avatars', 'pet-photos');

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

drop policy if exists "pet_photos_storage_select_owner" on storage.objects;

create policy "pet_photos_storage_select_owner"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- email_events: no client access (service role only)
-- ---------------------------------------------------------------------------

revoke all on table public.email_events from anon, authenticated;

notify pgrst, 'reload schema';
