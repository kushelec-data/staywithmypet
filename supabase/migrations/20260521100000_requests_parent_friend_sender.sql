-- pet_parent_id = sender, pet_friend_id = receiver (no requester_id / receiver_id / owner_id)

drop trigger if exists requests_set_pet_parent on public.requests;
drop trigger if exists requests_set_participants on public.requests;

drop policy if exists "requests_insert_friend" on public.requests;
drop policy if exists "requests_insert_requester" on public.requests;
drop policy if exists "requests_update_receiver_respond" on public.requests;
drop policy if exists "requests_update_requester_cancel" on public.requests;
drop policy if exists "requests_update_participant" on public.requests;

drop policy if exists "requests_select_participant" on public.requests;

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
    pet_parent_id = (select auth.uid())
    and pet_friend_id <> (select auth.uid())
    and (
      pet_id is null
      or exists (
        select 1 from public.pets p
        where p.id = pet_id
          and p.is_active = true
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
