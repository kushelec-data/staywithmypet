-- In-app notifications (request + message events)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type public.notification_type as enum (
      'care_request_received',
      'request_accepted',
      'request_declined',
      'message_received'
    );
  end if;
end $$;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  related_request_id uuid references public.requests (id) on delete cascade,
  related_conversation_id uuid references public.conversations (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create index notifications_user_unread_idx
  on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, update on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Trigger helpers (security definer — inserts bypass RLS)
-- ---------------------------------------------------------------------------

create or replace function public.notify_care_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.pet_friend_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, related_request_id)
  values (
    new.pet_friend_id,
    'care_request_received',
    'New care request',
    'You received a new care request.',
    new.id
  );

  return new;
end;
$$;

create or replace function public.notify_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications (user_id, type, title, body, related_request_id)
    values (
      new.pet_parent_id,
      'request_accepted',
      'Request accepted',
      'Your care request was accepted.',
      new.id
    );
  elsif new.status = 'declined' and old.status is distinct from 'declined' then
    insert into public.notifications (user_id, type, title, body, related_request_id)
    values (
      new.pet_parent_id,
      'request_declined',
      'Request declined',
      'Your care request was declined.',
      new.id
    );
  end if;

  return new;
end;
$$;

create or replace function public.notify_message_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
  v_friend uuid;
  v_recipient uuid;
  v_request_id uuid;
  v_preview text;
begin
  select c.pet_parent_id, c.pet_friend_id, c.request_id
  into v_parent, v_friend, v_request_id
  from public.conversations c
  where c.id = new.conversation_id;

  if new.sender_id = v_parent then
    v_recipient := v_friend;
  elsif new.sender_id = v_friend then
    v_recipient := v_parent;
  else
    return new;
  end if;

  if v_recipient is null or v_recipient = new.sender_id then
    return new;
  end if;

  v_preview := left(trim(new.body), 120);
  if v_preview = '' then
    v_preview := 'You have a new message.';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    related_request_id,
    related_conversation_id
  )
  values (
    v_recipient,
    'message_received',
    'New message',
    v_preview,
    v_request_id,
    new.conversation_id
  );

  return new;
end;
$$;

drop trigger if exists requests_notify_received on public.requests;
create trigger requests_notify_received
after insert on public.requests
for each row
execute function public.notify_care_request_received();

drop trigger if exists requests_notify_status_change on public.requests;
create trigger requests_notify_status_change
after update of status on public.requests
for each row
execute function public.notify_request_status_change();

drop trigger if exists messages_notify_received on public.messages;
create trigger messages_notify_received
after insert on public.messages
for each row
execute function public.notify_message_received();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;
