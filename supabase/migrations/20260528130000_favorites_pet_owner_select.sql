-- Allow pet owners to read favorites rows for their pets (save counts on owner preview).

drop policy if exists favorites_select_pet_owner on public.favorites;

create policy favorites_select_pet_owner
  on public.favorites for select
  to authenticated
  using (
    pet_id is not null
    and exists (
      select 1
      from public.pets p
      where p.id = favorites.pet_id
        and p.owner_id = (select auth.uid())
    )
  );
