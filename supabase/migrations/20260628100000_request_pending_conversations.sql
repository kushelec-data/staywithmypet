-- Allow messaging on pending requests so request messages can seed conversations before accept.

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
      and r.status in ('pending', 'accepted', 'completed')
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
      and r.status in ('pending', 'accepted', 'completed')
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
  v_status text;
begin
  select r.pet_parent_id, r.pet_friend_id, r.status
  into v_parent, v_friend, v_status
  from public.requests r
  where r.id = p_request_id;

  if v_status is null or v_status not in ('pending', 'accepted', 'completed') then
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

drop policy if exists "conversations_select_participant" on public.conversations;

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
        and r.status in ('pending', 'accepted', 'completed')
    )
  );
