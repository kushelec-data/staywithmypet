-- Notifications: correct types, receiver/sender targeting, sender name in body.

do $$
begin
  if exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'notification_type'
      and e.enumlabel = 'care_request_received'
  ) then
    alter type public.notification_type rename value 'care_request_received' to 'request_received';
  end if;

  if exists (
    select 1
    from pg_enum e
    join pg_type t on e.enumtypid = t.oid
    where t.typname = 'notification_type'
      and e.enumlabel = 'message_received'
  ) then
    alter type public.notification_type rename value 'message_received' to 'new_message';
  end if;
end $$;

create or replace function public.notify_care_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
begin
  if new.receiver_id is null or new.sender_id is null then
    return new;
  end if;

  if new.receiver_id = new.sender_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.display_name), ''), 'Someone')
  into v_sender_name
  from public.profiles p
  where p.id = new.sender_id;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    related_request_id,
    read_at
  )
  values (
    new.receiver_id,
    'request_received',
    'New care request',
    v_sender_name || ' sent you a care request',
    new.id,
    null
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

  if new.sender_id is null then
    return new;
  end if;

  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.notifications (user_id, type, title, body, related_request_id, read_at)
    values (
      new.sender_id,
      'request_accepted',
      'Request accepted',
      'Your care request was accepted.',
      new.id,
      null
    );
  elsif new.status = 'declined' and old.status is distinct from 'declined' then
    insert into public.notifications (user_id, type, title, body, related_request_id, read_at)
    values (
      new.sender_id,
      'request_declined',
      'Request declined',
      'Your care request was declined.',
      new.id,
      null
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
  v_preview text;
begin
  select c.pet_parent_id, c.pet_friend_id
  into v_parent, v_friend
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
    related_conversation_id,
    read_at
  )
  values (
    v_recipient,
    'new_message',
    'New message',
    v_preview,
    new.conversation_id,
    null
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
