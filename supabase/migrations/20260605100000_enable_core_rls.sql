-- Core RLS for profiles, pets, pet_photos, requests, reviews.
-- Idempotent: re-enables RLS and re-applies canonical policies from prior migrations.

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_photos enable row level security;
alter table public.requests enable row level security;
alter table public.reviews enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  to authenticated, anon
  using (
    is_public = true
    or id = (select auth.uid())
  );

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

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pets
-- ---------------------------------------------------------------------------

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

drop policy if exists "pets_insert_owner" on public.pets;
create policy "pets_insert_owner"
  on public.pets for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "pets_update_owner" on public.pets;
create policy "pets_update_owner"
  on public.pets for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "pets_delete_owner" on public.pets;
create policy "pets_delete_owner"
  on public.pets for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- pet_photos
-- ---------------------------------------------------------------------------

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

drop policy if exists "pet_photos_insert_owner" on public.pet_photos;
create policy "pet_photos_insert_owner"
  on public.pet_photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "pet_photos_update_owner" on public.pet_photos;
create policy "pet_photos_update_owner"
  on public.pet_photos for update
  to authenticated
  using (
    exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = (select auth.uid())
    )
  );

drop policy if exists "pet_photos_delete_owner" on public.pet_photos;
create policy "pet_photos_delete_owner"
  on public.pet_photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- requests
-- ---------------------------------------------------------------------------

drop policy if exists "requests_select_participant" on public.requests;
drop policy if exists "requests_insert_friend" on public.requests;
drop policy if exists "requests_insert_requester" on public.requests;
drop policy if exists "requests_insert_participant" on public.requests;
drop policy if exists "requests_insert_sender" on public.requests;
drop policy if exists requests_insert_sender on public.requests;
drop policy if exists "requests_update_participant" on public.requests;
drop policy if exists "requests_update_receiver_respond" on public.requests;
drop policy if exists "requests_update_requester_cancel" on public.requests;
drop policy if exists "requests_update_sender_cancel" on public.requests;

create policy "requests_select_participant"
  on public.requests for select
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

create policy "requests_insert_sender"
  on public.requests for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and receiver_id <> (select auth.uid())
    and pet_parent_id <> pet_friend_id
    and not public.users_are_blocked((select auth.uid()), receiver_id)
    and (
      (pet_parent_id = (select auth.uid()) and pet_friend_id = receiver_id)
      or (pet_friend_id = (select auth.uid()) and pet_parent_id = receiver_id)
    )
    and (
      pet_id is null
      or exists (
        select 1
        from public.pets p
        where p.id = pet_id
          and p.is_active = true
          and p.owner_id = pet_parent_id
      )
    )
  );

create policy "requests_update_receiver_respond"
  on public.requests for update
  to authenticated
  using (
    pet_friend_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    pet_friend_id = (select auth.uid())
    and status in ('accepted', 'declined')
  );

create policy "requests_update_sender_cancel"
  on public.requests for update
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    pet_parent_id = (select auth.uid())
    and status = 'cancelled'
  );

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

drop policy if exists "reviews_select_all" on public.reviews;
drop policy if exists reviews_select_all on public.reviews;
drop policy if exists "reviews_insert_participant" on public.reviews;
drop policy if exists reviews_insert_participant on public.reviews;
drop policy if exists "reviews_update_own" on public.reviews;
drop policy if exists reviews_update_own on public.reviews;
drop policy if exists "reviews_insert_own" on public.reviews;
drop policy if exists reviews_insert_own on public.reviews;

create policy "reviews_select_all"
  on public.reviews for select
  to authenticated, anon
  using (true);

create policy "reviews_insert_own"
  on public.reviews for insert
  to authenticated
  with check (reviewer_id = (select auth.uid()));
