-- Secure contact sharing for confirmed/active/completed bookings.
-- Exposes only whitelisted contact fields via security definer RPC (not broad profile SELECT).

create or replace function public.is_booking_participant(p_booking_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.id = p_booking_id
      and p_user_id is not null
      and (
        b.pet_parent_id = p_user_id
        or b.pet_friend_id = p_user_id
      )
  );
$$;

create or replace function public.booking_allows_contact_share(p_status public.booking_status)
returns boolean
language sql
immutable
as $$
  select p_status in ('upcoming', 'active', 'completed');
$$;

create or replace function public.emergency_contact_relationship_from_details(p_details jsonb)
returns text
language sql
immutable
as $$
  select nullif(
    trim(
      coalesce(
        p_details->>'emergency_contact_relationship',
        p_details->'emergency_contact'->>'relationship'
      )
    ),
    ''
  );
$$;

create or replace function public.get_booking_participant_contact(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_booking public.bookings%rowtype;
  v_other_id uuid;
  v_other_role text;
  v_profile public.profiles%rowtype;
  v_email text;
  v_phone_e164 text;
  v_phone_display text;
  v_address text;
  v_emergency_phone_e164 text;
  v_emergency_phone_display text;
  v_emergency_name text;
  v_emergency_relationship text;
begin
  if v_uid is null then
    return null;
  end if;

  select * into v_booking
  from public.bookings b
  where b.id = p_booking_id;

  if v_booking.id is null then
    return null;
  end if;

  if v_uid is distinct from v_booking.pet_parent_id
     and v_uid is distinct from v_booking.pet_friend_id then
    return null;
  end if;

  if v_uid = v_booking.pet_parent_id then
    v_other_id := v_booking.pet_friend_id;
    v_other_role := 'pet_friend';
  else
    v_other_id := v_booking.pet_parent_id;
    v_other_role := 'pet_parent';
  end if;

  select * into v_profile
  from public.profiles p
  where p.id = v_other_id;

  if v_profile.id is null then
    return null;
  end if;

  if not public.booking_allows_contact_share(v_booking.status) then
    return jsonb_build_object(
      'viewer_role',
      case when v_uid = v_booking.pet_parent_id then 'pet_parent' else 'pet_friend' end,
      'other_party',
      jsonb_build_object(
        'id', v_other_id,
        'display_name', coalesce(nullif(trim(v_profile.display_name), ''), 'Member'),
        'avatar_url', v_profile.avatar_url,
        'role', v_other_role
      ),
      'contact_allowed', false,
      'contact', null
    );
  end if;

  select u.email into v_email
  from auth.users u
  where u.id = v_other_id;

  v_phone_e164 := nullif(trim(coalesce(v_profile.phone_e164, v_profile.phone)), '');
  if v_phone_e164 is null then
    if nullif(trim(v_profile.phone_number), '') is not null
       and nullif(trim(v_profile.phone_country_code), '') is not null then
      v_phone_display := trim(v_profile.phone_country_code) || ' ' || trim(v_profile.phone_number);
    else
      v_phone_display := null;
    end if;
  else
    v_phone_display := v_phone_e164;
  end if;

  v_address := nullif(trim(coalesce(v_profile.formatted_address, v_profile.address)), '');

  v_emergency_name := nullif(trim(v_profile.emergency_contact_name), '');
  v_emergency_phone_e164 := nullif(trim(v_profile.emergency_contact_phone_e164), '');
  if v_emergency_phone_e164 is null then
    if nullif(trim(v_profile.emergency_contact_phone_number), '') is not null
       and nullif(trim(v_profile.emergency_contact_phone_country_code), '') is not null then
      v_emergency_phone_display :=
        trim(v_profile.emergency_contact_phone_country_code)
        || ' '
        || trim(v_profile.emergency_contact_phone_number);
    else
      v_emergency_phone_display := null;
    end if;
  else
    v_emergency_phone_display := v_emergency_phone_e164;
  end if;

  v_emergency_relationship := public.emergency_contact_relationship_from_details(v_profile.details);

  return jsonb_build_object(
    'viewer_role',
    case when v_uid = v_booking.pet_parent_id then 'pet_parent' else 'pet_friend' end,
    'other_party',
    jsonb_build_object(
      'id', v_other_id,
      'display_name', coalesce(nullif(trim(v_profile.display_name), ''), 'Member'),
      'avatar_url', v_profile.avatar_url,
      'role', v_other_role
    ),
    'contact_allowed', true,
    'contact',
    jsonb_build_object(
      'phone_e164', v_phone_e164,
      'phone_display', coalesce(v_phone_display, v_phone_e164),
      'email', nullif(trim(v_email), ''),
      'address', v_address,
      'emergency_name', v_emergency_name,
      'emergency_phone_e164', v_emergency_phone_e164,
      'emergency_phone_display', coalesce(v_emergency_phone_display, v_emergency_phone_e164),
      'emergency_relationship', v_emergency_relationship
    )
  );
end;
$$;

revoke all on function public.get_booking_participant_contact(uuid) from public;
grant execute on function public.get_booking_participant_contact(uuid) to authenticated;

revoke all on function public.is_booking_participant(uuid, uuid) from public;
grant execute on function public.is_booking_participant(uuid, uuid) to authenticated;

revoke all on function public.booking_allows_contact_share(public.booking_status) from public;
grant execute on function public.booking_allows_contact_share(public.booking_status) to authenticated;

-- Defense in depth: booking participants may read the other party's profile only for
-- active contact-sharing bookings (same statuses as the RPC gate).
drop policy if exists "profiles_select_booking_participant" on public.profiles;
create policy "profiles_select_booking_participant"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where public.booking_allows_contact_share(b.status)
        and (
          (b.pet_parent_id = (select auth.uid()) and b.pet_friend_id = profiles.id)
          or (b.pet_friend_id = (select auth.uid()) and b.pet_parent_id = profiles.id)
        )
    )
  );
