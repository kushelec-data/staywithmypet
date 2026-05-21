-- Fix conversation creation on accept + readable RLS for participants

-- Backfill participant columns (safe if already set)
update public.conversations c
set
  pet_parent_id = coalesce(c.pet_parent_id, r.pet_parent_id),
  pet_friend_id = coalesce(c.pet_friend_id, r.pet_friend_id)
from public.requests r
where r.id = c.request_id;

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
  v_status public.request_status;
begin
  select r.pet_parent_id, r.pet_friend_id, r.status
  into v_parent, v_friend, v_status
  from public.requests r
  where r.id = p_request_id;

  if v_parent is null or v_friend is null then
    return null;
  end if;

  if v_status not in ('accepted', 'completed') then
    return null;
  end if;

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
  if new.status = 'accepted' and (old.status is distinct from 'accepted') then
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

-- Participant access via request (works even when conversation columns were null)
drop policy if exists "conversations_select_participant" on public.conversations;
drop policy if exists "conversations_insert_participant" on public.conversations;

create policy "conversations_select_participant"
  on public.conversations for select
  to authenticated
  using (
    exists (
      select 1
      from public.requests r
      where r.id = request_id
        and r.status in ('accepted', 'completed')
        and (
          r.pet_parent_id = (select auth.uid())
          or r.pet_friend_id = (select auth.uid())
        )
    )
  );

create policy "conversations_insert_participant"
  on public.conversations for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.requests r
      where r.id = request_id
        and r.status in ('accepted', 'completed')
        and (
          r.pet_parent_id = (select auth.uid())
          or r.pet_friend_id = (select auth.uid())
        )
        and pet_parent_id = r.pet_parent_id
        and pet_friend_id = r.pet_friend_id
    )
  );

grant insert on public.conversations to authenticated;
grant execute on function public.ensure_conversation_for_request(uuid) to authenticated;
