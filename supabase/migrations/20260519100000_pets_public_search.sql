-- Public pet discovery + request metadata

alter table public.pets
  add column if not exists is_public boolean not null default false;

update public.pets
set is_public = is_active
where is_public = false and is_active = true;

create index if not exists pets_public_idx on public.pets (is_public) where is_public = true;

alter table public.requests
  add column if not exists care_type text;

alter table public.requests
  add column if not exists requested_dates date[] not null default '{}';

-- Public can read listed pets when owner profile is public
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
      select 1 from public.pets p
      where p.id = pet_id
        and (
          p.owner_id = (select auth.uid())
          or (
            p.is_public = true
            and p.is_active = true
            and exists (
              select 1 from public.profiles pr
              where pr.id = p.owner_id
                and pr.is_public = true
            )
          )
        )
    )
  );
