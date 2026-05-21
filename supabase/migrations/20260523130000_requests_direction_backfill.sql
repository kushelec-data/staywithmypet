-- Backfill direction from initiated_by_id (never guess from pet_id alone — both flows use pets).

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
  and (r.sender_id is null or r.receiver_id is null);

update public.requests r
set
  sender_id = r.pet_parent_id,
  receiver_id = r.pet_friend_id
where r.initiated_by_id is null
  and r.pet_parent_id <> r.pet_friend_id
  and (r.sender_id is null or r.receiver_id is null);

-- Sync initiated_by_id with sender when missing
update public.requests
set initiated_by_id = sender_id
where initiated_by_id is null and sender_id is not null;

-- On insert: copy client direction fields; do not guess from roles alone
create or replace function public.set_request_direction_from_roles()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id is not null and new.receiver_id is not null then
    if new.initiated_by_id is null then
      new.initiated_by_id := new.sender_id;
    end if;
    return new;
  end if;

  if new.initiated_by_id is not null then
    new.sender_id := new.initiated_by_id;
    new.receiver_id := case
      when new.initiated_by_id = new.pet_parent_id then new.pet_friend_id
      else new.pet_parent_id
    end;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists requests_set_direction on public.requests;

create trigger requests_set_direction
before insert on public.requests
for each row
execute function public.set_request_direction_from_roles();
