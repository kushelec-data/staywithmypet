-- Messaging fix: participant columns, idempotent tables, RLS, grants, sync

-- ---------------------------------------------------------------------------
-- Tables (create if missing)
-- ---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_body_not_empty check (char_length(trim(body)) > 0)
);

alter table public.conversations
  add column if not exists pet_parent_id uuid references public.profiles (id) on delete cascade;

alter table public.conversations
  add column if not exists pet_friend_id uuid references public.profiles (id) on delete cascade;

create index if not exists conversations_request_id_idx on public.conversations (request_id);
create index if not exists conversations_pet_parent_id_idx on public.conversations (pet_parent_id);
create index if not exists conversations_pet_friend_id_idx on public.conversations (pet_friend_id);

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index if not exists messages_sender_id_idx on public.messages (sender_id);

-- Denormalize participants from requests
update public.conversations c
set
  pet_parent_id = coalesce(c.pet_parent_id, r.pet_parent_id),
  pet_friend_id = coalesce(c.pet_friend_id, r.pet_friend_id)
from public.requests r
where r.id = c.request_id;

-- Ensure one conversation per accepted/completed request
insert into public.conversations (request_id, pet_parent_id, pet_friend_id)
select r.id, r.pet_parent_id, r.pet_friend_id
from public.requests r
where r.status in ('accepted', 'completed')
  and r.pet_parent_id is not null
  and r.pet_friend_id is not null
on conflict (request_id) do update
set
  pet_parent_id = coalesce(public.conversations.pet_parent_id, excluded.pet_parent_id),
  pet_friend_id = coalesce(public.conversations.pet_friend_id, excluded.pet_friend_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_request_chat_eligible(
  p_request_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.requests r
    where r.id = p_request_id
      and (r.pet_parent_id = p_user_id or r.pet_friend_id = p_user_id)
      and r.status in ('accepted', 'completed')
  );
$$;

create or replace function public.is_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    inner join public.requests r on r.id = c.request_id
    where c.id = p_conversation_id
      and r.status in ('accepted', 'completed')
      and (
        c.pet_parent_id = p_user_id
        or c.pet_friend_id = p_user_id
        or r.pet_parent_id = p_user_id
        or r.pet_friend_id = p_user_id
      )
  );
$$;

create or replace function public.ensure_conversation_for_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_parent uuid;
  v_friend uuid;
begin
  if not public.is_request_chat_eligible(p_request_id) then
    return null;
  end if;

  select r.pet_parent_id, r.pet_friend_id
  into v_parent, v_friend
  from public.requests r
  where r.id = p_request_id;

  insert into public.conversations (request_id, pet_parent_id, pet_friend_id)
  values (p_request_id, v_parent, v_friend)
  on conflict (request_id) do update
  set
    pet_parent_id = coalesce(public.conversations.pet_parent_id, excluded.pet_parent_id),
    pet_friend_id = coalesce(public.conversations.pet_friend_id, excluded.pet_friend_id);

  select id into v_id from public.conversations where request_id = p_request_id;
  return v_id;
end;
$$;

create or replace function public.on_request_accepted_create_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'accepted' and (old.status is distinct from new.status) then
    perform public.ensure_conversation_for_request(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists requests_accepted_create_conversation on public.requests;

create trigger requests_accepted_create_conversation
after update of status on public.requests
for each row
execute function public.on_request_accepted_create_conversation();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select_participant" on public.conversations;
drop policy if exists "messages_select_participant" on public.messages;
drop policy if exists "messages_insert_participant" on public.messages;
drop policy if exists "messages_update_mark_read" on public.messages;

create policy "conversations_select_participant"
  on public.conversations for select
  to authenticated
  using (
    (
      pet_parent_id = (select auth.uid())
      or pet_friend_id = (select auth.uid())
    )
    and exists (
      select 1
      from public.requests r
      where r.id = request_id
        and r.status in ('accepted', 'completed')
    )
  );

create policy "messages_select_participant"
  on public.messages for select
  to authenticated
  using (public.is_conversation_participant(conversation_id));

create policy "messages_insert_participant"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  );

create policy "messages_update_mark_read"
  on public.messages for update
  to authenticated
  using (
    sender_id <> (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  )
  with check (
    sender_id <> (select auth.uid())
    and public.is_conversation_participant(conversation_id)
  );

-- ---------------------------------------------------------------------------
-- Grants (required for PostgREST / client API)
-- ---------------------------------------------------------------------------

grant select on public.conversations to authenticated;
grant select, insert, update on public.messages to authenticated;

grant execute on function public.ensure_conversation_for_request(uuid) to authenticated;
grant execute on function public.is_request_chat_eligible(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_participant(uuid, uuid) to authenticated;

-- Realtime
alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
