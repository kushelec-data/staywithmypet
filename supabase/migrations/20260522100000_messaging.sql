-- Request-linked messaging (conversations + messages)

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create index conversations_request_id_idx on public.conversations (request_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_body_not_empty check (char_length(trim(body)) > 0)
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);

create index messages_sender_id_idx on public.messages (sender_id);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

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
    join public.requests r on r.id = c.request_id
    where c.id = p_conversation_id
      and (r.pet_parent_id = p_user_id or r.pet_friend_id = p_user_id)
      and r.status in ('accepted', 'completed')
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
begin
  if not public.is_request_chat_eligible(p_request_id) then
    return null;
  end if;

  insert into public.conversations (request_id)
  values (p_request_id)
  on conflict (request_id) do nothing;

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

-- Backfill conversations for already-accepted requests
insert into public.conversations (request_id)
select r.id
from public.requests r
where r.status in ('accepted', 'completed')
on conflict (request_id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

drop policy if exists "conversations_select_participant" on public.conversations;
drop policy if exists "messages_select_participant" on public.messages;
drop policy if exists "messages_insert_participant" on public.messages;
drop policy if exists "messages_update_mark_read" on public.messages;

create policy "conversations_select_participant"
  on public.conversations for select
  to authenticated
  using (public.is_conversation_participant(id));

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

grant execute on function public.ensure_conversation_for_request(uuid) to authenticated;

-- Realtime (postgres changes on messages)
alter table public.messages replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;
