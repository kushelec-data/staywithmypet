-- Fix infinite recursion (42P17) on public.requests RLS.
-- Policies use only row columns + auth.uid(); no subqueries on requests.
-- Pet ownership check uses security definer to avoid pets/profiles → requests cycles.

-- ---------------------------------------------------------------------------
-- Helper: pet active + owned by parent (bypasses pets RLS)
-- ---------------------------------------------------------------------------

create or replace function public.request_pet_owned_by_parent(
  p_pet_id uuid,
  p_parent_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pets p
    where p.id = p_pet_id
      and p.is_active = true
      and p.owner_id = p_parent_id
  );
$$;

grant execute on function public.request_pet_owned_by_parent(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Drop all existing policies on requests
-- ---------------------------------------------------------------------------

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'requests'
  loop
    execute format('drop policy if exists %I on public.requests', pol.policyname);
  end loop;
end $$;

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
drop policy if exists "requests_update_recipient_respond" on public.requests;
drop policy if exists "requests_update_initiator_cancel" on public.requests;

-- ---------------------------------------------------------------------------
-- Non-recursive RLS
-- ---------------------------------------------------------------------------

create policy "requests_select_participant"
  on public.requests for select
  to authenticated
  using (
    sender_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

create policy "requests_insert_sender"
  on public.requests for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and receiver_id is not null
    and receiver_id <> (select auth.uid())
    and pet_parent_id <> pet_friend_id
    and (
      (pet_parent_id = (select auth.uid()) and pet_friend_id = receiver_id)
      or (pet_friend_id = (select auth.uid()) and pet_parent_id = receiver_id)
    )
    and (
      pet_id is null
      or public.request_pet_owned_by_parent(pet_id, pet_parent_id)
    )
  );

create policy "requests_update_receiver_respond"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and receiver_id = (select auth.uid())
  )
  with check (
    receiver_id = (select auth.uid())
    and status in ('accepted', 'declined')
  );

create policy "requests_update_sender_cancel"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and sender_id = (select auth.uid())
  )
  with check (
    sender_id = (select auth.uid())
    and status = 'cancelled'
  );

notify pgrst, 'reload schema';
