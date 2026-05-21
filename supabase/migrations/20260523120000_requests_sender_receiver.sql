-- Request direction: sender_id / receiver_id (who sent vs who receives).
-- pet_parent_id / pet_friend_id remain booking roles only.

alter table public.requests
  add column if not exists sender_id uuid references public.profiles (id) on delete cascade;

alter table public.requests
  add column if not exists receiver_id uuid references public.profiles (id) on delete cascade;

-- Legacy requester_id → sender_id
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'requests'
      and column_name = 'requester_id'
  ) then
    execute $sql$
      update public.requests
      set sender_id = requester_id
      where sender_id is null and requester_id is not null
    $sql$;
  end if;
end $$;

-- initiated_by_id → sender + receiver
update public.requests r
set
  sender_id = r.initiated_by_id,
  receiver_id = case
    when r.initiated_by_id = r.pet_parent_id then r.pet_friend_id
    else r.pet_parent_id
  end
where r.initiated_by_id is not null
  and (r.sender_id is null or r.receiver_id is null);

-- Remaining rows without initiated_by_id: parent→friend (legacy Case A default only)
update public.requests r
set
  sender_id = r.pet_parent_id,
  receiver_id = r.pet_friend_id
where r.initiated_by_id is null
  and (r.sender_id is null or r.receiver_id is null);

create index if not exists requests_sender_id_idx on public.requests (sender_id);
create index if not exists requests_receiver_id_idx on public.requests (receiver_id);

alter table public.requests
  drop constraint if exists requests_distinct_direction;

alter table public.requests
  add constraint requests_distinct_direction check (sender_id <> receiver_id);

-- RLS: direction via sender_id / receiver_id
drop policy if exists "requests_insert_participant" on public.requests;

create policy "requests_insert_sender"
  on public.requests for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and receiver_id <> (select auth.uid())
    and pet_parent_id <> pet_friend_id
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

drop policy if exists "requests_update_recipient_respond" on public.requests;

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

drop policy if exists "requests_update_initiator_cancel" on public.requests;

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
