-- RLS for public.favorites (saved pets and Pet Friend profiles).
-- Idempotent: re-enables RLS and re-applies canonical own-row policies.

alter table public.favorites enable row level security;

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------

drop policy if exists "favorites_select_own" on public.favorites;
drop policy if exists favorites_select_own on public.favorites;

create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "favorites_insert_own" on public.favorites;
drop policy if exists favorites_insert_own on public.favorites;

create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "favorites_delete_own" on public.favorites;
drop policy if exists favorites_delete_own on public.favorites;

create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- No UPDATE policy: app only inserts/deletes favorites rows.
