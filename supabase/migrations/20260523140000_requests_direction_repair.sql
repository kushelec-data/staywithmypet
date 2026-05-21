-- Repair request direction from initiated_by_id; fix notifications; drop legacy trigger.

drop trigger if exists requests_set_participants on public.requests;

-- Align sender/receiver with who initiated (authoritative when set on insert).
update public.requests r
set
  sender_id = r.initiated_by_id,
  receiver_id = case
    when r.initiated_by_id = r.pet_parent_id then r.pet_friend_id
    else r.pet_parent_id
  end
where r.initiated_by_id is not null
  and r.pet_parent_id <> r.pet_friend_id
  and r.initiated_by_id in (r.pet_parent_id, r.pet_friend_id)
  and (
    r.sender_id is distinct from r.initiated_by_id
    or r.receiver_id is distinct from case
      when r.initiated_by_id = r.pet_parent_id then r.pet_friend_id
      else r.pet_parent_id
    end
  );

-- Rows with no initiated_by_id: default parent→friend (legacy Case A only).
update public.requests r
set
  sender_id = r.pet_parent_id,
  receiver_id = r.pet_friend_id,
  initiated_by_id = r.pet_parent_id
where r.initiated_by_id is null
  and r.pet_parent_id <> r.pet_friend_id
  and (r.sender_id is null or r.receiver_id is null);

-- Notifications: recipient is receiver (not role column pet_friend_id).
create or replace function public.notify_care_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.receiver_id is null then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, related_request_id)
  values (
    new.receiver_id,
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
      new.sender_id,
      'request_accepted',
      'Request accepted',
      'Your care request was accepted.',
      new.id
    );
  elsif new.status = 'declined' and old.status is distinct from 'declined' then
    insert into public.notifications (user_id, type, title, body, related_request_id)
    values (
      new.sender_id,
      'request_declined',
      'Request declined',
      'Your care request was declined.',
      new.id
    );
  end if;

  return new;
end;
$$;
