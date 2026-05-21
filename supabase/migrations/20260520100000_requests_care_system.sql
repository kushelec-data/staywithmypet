-- Care request system: owner_id, date columns, RLS aligned with requester/receiver/owner

alter table public.requests
  add column if not exists owner_id uuid references public.profiles (id) on delete cascade;

alter table public.requests
  add column if not exists date_from date;

alter table public.requests
  add column if not exists date_to date;

-- Backfill owner and dates from legacy columns
update public.requests
set owner_id = coalesce(owner_id, pet_parent_id)
where owner_id is null;

update public.requests
set
  date_from = coalesce(date_from, (starts_at at time zone 'utc')::date),
  date_to = coalesce(date_to, (ends_at at time zone 'utc')::date)
where date_from is null and starts_at is not null;

update public.requests
set care_type = coalesce(care_type, service_type)
where care_type is null and service_type is not null;

create index if not exists requests_owner_id_idx on public.requests (owner_id);
create index if not exists requests_date_from_idx on public.requests (date_from);

-- Keep requester/receiver/pet/status indexes from prior migrations

create or replace function public.set_request_participants()
returns trigger
language plpgsql
as $$
declare
  v_pet_owner uuid;
begin
  if new.pet_id is not null then
    select p.owner_id into v_pet_owner from public.pets p where p.id = new.pet_id;
    if v_pet_owner is null then
      raise exception 'Pet not found';
    end if;
    new.pet_parent_id := coalesce(new.pet_parent_id, v_pet_owner);

    if new.owner_id is null then
      if new.requester_id = v_pet_owner then
        new.owner_id := new.requester_id;
      else
        new.owner_id := v_pet_owner;
      end if;
    end if;

    if new.receiver_id is null then
      if new.requester_id = v_pet_owner then
        new.receiver_id := new.pet_friend_id;
      else
        new.receiver_id := v_pet_owner;
      end if;
    end if;

    if new.requester_id is null then
      new.requester_id := new.pet_friend_id;
    end if;
  else
    if new.owner_id is null then
      new.owner_id := new.pet_parent_id;
    end if;
    if new.requester_id is null then
      new.requester_id := new.pet_parent_id;
    end if;
    if new.receiver_id is null then
      new.receiver_id := new.pet_friend_id;
    end if;
  end if;

  if new.date_from is null and new.starts_at is not null then
    new.date_from := (new.starts_at at time zone 'utc')::date;
  end if;
  if new.date_to is null and new.ends_at is not null then
    new.date_to := (new.ends_at at time zone 'utc')::date;
  end if;

  if new.care_type is null and new.service_type is not null then
    new.care_type := new.service_type;
  end if;

  return new;
end;
$$;

drop trigger if exists requests_set_pet_parent on public.requests;

create trigger requests_set_participants
before insert on public.requests
for each row execute function public.set_request_participants();

-- RLS
drop policy if exists "requests_select_participant" on public.requests;
drop policy if exists "requests_insert_requester" on public.requests;
drop policy if exists "requests_update_participant" on public.requests;

create policy "requests_select_participant"
  on public.requests for select
  to authenticated
  using (
    requester_id = (select auth.uid())
    or receiver_id = (select auth.uid())
    or owner_id = (select auth.uid())
  );

create policy "requests_insert_requester"
  on public.requests for insert
  to authenticated
  with check (
    requester_id = (select auth.uid())
    and receiver_id <> (select auth.uid())
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
    receiver_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    receiver_id = (select auth.uid())
    and status in ('accepted', 'declined')
  );

create policy "requests_update_requester_cancel"
  on public.requests for update
  to authenticated
  using (
    requester_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    requester_id = (select auth.uid())
    and status = 'cancelled'
  );
