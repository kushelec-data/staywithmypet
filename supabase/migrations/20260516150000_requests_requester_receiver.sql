-- Support profile-based requests and explicit requester/receiver

alter table public.requests
  alter column pet_id drop not null;

alter table public.requests
  add column if not exists requester_id uuid references public.profiles (id) on delete cascade;

alter table public.requests
  add column if not exists receiver_id uuid references public.profiles (id) on delete cascade;

-- Backfill from existing pet-friend-initiated rows
update public.requests
set
  requester_id = pet_friend_id,
  receiver_id = pet_parent_id
where requester_id is null;

alter table public.requests
  alter column requester_id set not null;

update public.requests
set receiver_id = pet_parent_id
where receiver_id is null;

alter table public.requests
  alter column receiver_id set not null;

create index if not exists requests_requester_id_idx on public.requests (requester_id);
create index if not exists requests_receiver_id_idx on public.requests (receiver_id);

create or replace function public.set_request_pet_parent()
returns trigger
language plpgsql
as $$
declare
  v_owner uuid;
begin
  if new.pet_id is not null then
    select owner_id into v_owner from public.pets where id = new.pet_id;
    if v_owner is null then
      raise exception 'Pet not found';
    end if;
    new.pet_parent_id := v_owner;
    if new.receiver_id is null then
      new.receiver_id := v_owner;
    end if;
    if new.requester_id is null then
      new.requester_id := new.pet_friend_id;
    end if;
  end if;

  if new.requester_id is not null and new.receiver_id is null then
    if new.requester_id = new.pet_friend_id then
      new.receiver_id := new.pet_parent_id;
    else
      new.receiver_id := new.pet_friend_id;
    end if;
  end if;

  return new;
end;
$$;

drop policy if exists "requests_insert_friend" on public.requests;

create policy "requests_insert_requester"
  on public.requests for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and receiver_id <> (select auth.uid())
    and (
      (
        pet_id is not null
        and pet_friend_id = (select auth.uid())
        and exists (
          select 1 from public.pets p
          where p.id = pet_id
            and p.is_active = true
            and p.owner_id = receiver_id
        )
      )
      or (
        pet_id is null
        and pet_parent_id = (select auth.uid())
        and pet_friend_id = receiver_id
        and exists (
          select 1 from public.profiles pr
          where pr.id = receiver_id
            and pr.is_public = true
        )
      )
    )
  );

drop policy if exists "requests_update_participant" on public.requests;

create policy "requests_update_participant"
  on public.requests for update
  to authenticated
  using (
    requester_id = (select auth.uid())
    or receiver_id = (select auth.uid())
  )
  with check (
    requester_id = (select auth.uid())
    or receiver_id = (select auth.uid())
  );
