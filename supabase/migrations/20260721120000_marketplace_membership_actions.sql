-- Marketplace membership model: gate paid actions (send/accept/message), not search visibility.
-- Accept requests atomically via RPC; block direct client accept updates.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.request_last_care_date(p_request public.requests)
returns date
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select max(d::date)
      from unnest(coalesce(p_request.requested_dates, array[]::date[])) as d
    ),
    p_request.date_to,
    p_request.date_from
  );
$$;

create or replace function public.request_care_dates_are_past(p_request public.requests)
returns boolean
language sql
stable
set search_path = public
as $$
  select public.request_last_care_date(p_request) is not null
    and public.request_last_care_date(p_request) < (timezone('utc', now()))::date;
$$;

create or replace function public.has_active_membership_for_role(
  p_user_id uuid,
  p_role public.membership_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_role = 'pet_parent'::public.membership_role then
      public.has_active_pet_parent_membership(p_user_id)
    when p_role = 'pet_friend'::public.membership_role then
      public.has_active_pet_friend_membership(p_user_id)
    else false
  end;
$$;

revoke all on function public.has_active_membership_for_role(uuid, public.membership_role) from public;
grant execute on function public.has_active_membership_for_role(uuid, public.membership_role) to authenticated;

create or replace function public.request_sender_membership_role(p_request public.requests)
returns public.membership_role
language sql
stable
set search_path = public
as $$
  select case
    when p_request.sender_id = p_request.pet_parent_id then 'pet_parent'::public.membership_role
    when p_request.sender_id = p_request.pet_friend_id then 'pet_friend'::public.membership_role
    else null
  end;
$$;

create or replace function public.request_receiver_membership_role(p_request public.requests)
returns public.membership_role
language sql
stable
set search_path = public
as $$
  select case
    when p_request.receiver_id = p_request.pet_parent_id then 'pet_parent'::public.membership_role
    when p_request.receiver_id = p_request.pet_friend_id then 'pet_friend'::public.membership_role
    else null
  end;
$$;

create or replace function public.sender_has_active_membership_for_conversation(
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
      and p_user_id is not null
      and r.status in ('pending', 'accepted', 'completed')
      and (
        (
          r.pet_parent_id = p_user_id
          and public.has_active_pet_parent_membership(p_user_id)
        )
        or (
          r.pet_friend_id = p_user_id
          and public.has_active_pet_friend_membership(p_user_id)
        )
      )
  );
$$;

revoke all on function public.sender_has_active_membership_for_conversation(uuid, uuid) from public;
grant execute on function public.sender_has_active_membership_for_conversation(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic accept: membership check before status update + booking trigger
-- ---------------------------------------------------------------------------

create or replace function public.accept_care_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_request public.requests%rowtype;
  v_role public.membership_role;
  v_conversation_id uuid;
begin
  if v_uid is null then
    raise exception 'Not signed in.';
  end if;

  select * into v_request
  from public.requests
  where id = p_request_id
  for update;

  if v_request.id is null or v_request.status <> 'pending' then
    raise exception 'Request not found.';
  end if;

  if v_request.receiver_id is distinct from v_uid then
    raise exception 'Request not found.';
  end if;

  if public.request_care_dates_are_past(v_request) then
    raise exception 'This request has expired because the care dates have already passed.';
  end if;

  v_role := public.request_receiver_membership_role(v_request);

  if v_role is null then
    raise exception 'Invalid request participants.';
  end if;

  if not public.has_active_membership_for_role(v_uid, v_role) then
    raise exception
      'An active membership is required for messaging and bookings in your current mode. Upgrade on the Membership page.';
  end if;

  update public.requests
  set
    status = 'accepted',
    responded_at = timezone('utc', now())
  where id = p_request_id
    and status = 'pending';

  v_conversation_id := public.ensure_conversation_for_request(p_request_id);

  return v_conversation_id;
end;
$$;

revoke all on function public.accept_care_request(uuid) from public;
grant execute on function public.accept_care_request(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: sender membership on insert; accept only via RPC; message membership
-- ---------------------------------------------------------------------------

drop policy if exists "requests_insert_sender" on public.requests;

create policy "requests_insert_sender"
  on public.requests for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and receiver_id is not null
    and receiver_id <> (select auth.uid())
    and pet_parent_id <> pet_friend_id
    and (
      (pet_parent_id = (select auth.uid()) and pet_friend_id = receiver_id)
      or (pet_friend_id = (select auth.uid()) and pet_parent_id = receiver_id)
    )
    and (
      pet_id is null
      or public.request_pet_owned_by_parent(pet_id, pet_parent_id)
    )
    and (
      (
        sender_id = pet_parent_id
        and public.has_active_pet_parent_membership((select auth.uid()))
      )
      or (
        sender_id = pet_friend_id
        and public.has_active_pet_friend_membership((select auth.uid()))
      )
    )
  );

drop policy if exists "requests_update_receiver_respond" on public.requests;

create policy "requests_update_receiver_respond"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and receiver_id = (select auth.uid())
  )
  with check (
    receiver_id = (select auth.uid())
    and status = 'declined'
  );

drop policy if exists "messages_insert_participant" on public.messages;

create policy "messages_insert_participant"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = (select auth.uid())
    and public.is_conversation_participant(conversation_id)
    and public.sender_has_active_membership_for_conversation(conversation_id, (select auth.uid()))
  );

notify pgrst, 'reload schema';
