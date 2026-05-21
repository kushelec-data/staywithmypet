-- Fix request participants: both parent→friend and friend→pet flows + who can respond

alter table public.requests
  add column if not exists initiated_by_id uuid references public.profiles (id) on delete cascade;

update public.requests
set initiated_by_id = coalesce(initiated_by_id, pet_parent_id)
where initiated_by_id is null;

create index if not exists requests_initiated_by_id_idx on public.requests (initiated_by_id);

drop policy if exists "requests_insert_sender" on public.requests;

create policy "requests_insert_participant"
  on public.requests for insert
  to authenticated
  with check (
    initiated_by_id = (select auth.uid())
    and pet_parent_id <> pet_friend_id
    and (
      (pet_parent_id = (select auth.uid()) and pet_friend_id <> (select auth.uid()))
      or (pet_friend_id = (select auth.uid()) and pet_parent_id <> (select auth.uid()))
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

drop policy if exists "requests_update_receiver_respond" on public.requests;

create policy "requests_update_recipient_respond"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and initiated_by_id is distinct from (select auth.uid())
    and (
      pet_parent_id = (select auth.uid())
      or pet_friend_id = (select auth.uid())
    )
  )
  with check (
    status in ('accepted', 'declined')
    and (
      pet_parent_id = (select auth.uid())
      or pet_friend_id = (select auth.uid())
    )
  );

drop policy if exists "requests_update_sender_cancel" on public.requests;

create policy "requests_update_initiator_cancel"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and initiated_by_id = (select auth.uid())
  )
  with check (
    status = 'cancelled'
    and initiated_by_id = (select auth.uid())
  );
