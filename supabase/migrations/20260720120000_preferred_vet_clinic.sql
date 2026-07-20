-- Preferred veterinary clinic fields on Pet Parent profiles (private; shared via booking RPC only).

alter table public.profiles
  add column if not exists preferred_vet_clinic_name text,
  add column if not exists preferred_vet_veterinarian_name text,
  add column if not exists preferred_vet_phone text,
  add column if not exists preferred_vet_emergency_phone text,
  add column if not exists preferred_vet_email text,
  add column if not exists preferred_vet_address text,
  add column if not exists preferred_vet_city text,
  add column if not exists preferred_vet_postal_code text,
  add column if not exists preferred_vet_opening_hours text,
  add column if not exists preferred_vet_notes text,
  add column if not exists share_preferred_vet_during_booking boolean not null default true;

comment on column public.profiles.preferred_vet_clinic_name is 'Pet Parent preferred vet clinic; private until shared on eligible booking';
comment on column public.profiles.share_preferred_vet_during_booking is 'When true, clinic is shared with Pet Friend on eligible bookings';

-- Extend booking contact RPC with Pet Parent emergency + preferred vet (whitelisted fields only).
create or replace function public.preferred_vet_clinic_json(p_profile public.profiles)
returns jsonb
language sql
stable
as $$
  select case
    when nullif(trim(p_profile.preferred_vet_clinic_name), '') is null then null
    else jsonb_build_object(
      'clinic_name', nullif(trim(p_profile.preferred_vet_clinic_name), ''),
      'veterinarian_name', nullif(trim(p_profile.preferred_vet_veterinarian_name), ''),
      'phone', nullif(trim(p_profile.preferred_vet_phone), ''),
      'emergency_phone', nullif(trim(p_profile.preferred_vet_emergency_phone), ''),
      'email', nullif(trim(p_profile.preferred_vet_email), ''),
      'address', nullif(trim(p_profile.preferred_vet_address), ''),
      'city', nullif(trim(p_profile.preferred_vet_city), ''),
      'postal_code', nullif(trim(p_profile.preferred_vet_postal_code), ''),
      'opening_hours', nullif(trim(p_profile.preferred_vet_opening_hours), ''),
      'notes', nullif(trim(p_profile.preferred_vet_notes), '')
    )
  end;
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
  v_pet_parent_profile public.profiles%rowtype;
  v_email text;
  v_phone_e164 text;
  v_phone_display text;
  v_address text;
  v_emergency_phone_e164 text;
  v_emergency_phone_display text;
  v_emergency_name text;
  v_emergency_relationship text;
  v_pp_emergency_phone_e164 text;
  v_pp_emergency_phone_display text;
  v_pp_emergency_name text;
  v_pp_emergency_relationship text;
  v_preferred_vet jsonb;
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

  select * into v_pet_parent_profile
  from public.profiles p
  where p.id = v_booking.pet_parent_id;

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
      'contact', null,
      'pet_parent_emergency', null,
      'preferred_vet', null,
      'share_preferred_vet', false
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

  v_pp_emergency_name := nullif(trim(v_pet_parent_profile.emergency_contact_name), '');
  v_pp_emergency_phone_e164 := nullif(trim(v_pet_parent_profile.emergency_contact_phone_e164), '');
  if v_pp_emergency_phone_e164 is null then
    if nullif(trim(v_pet_parent_profile.emergency_contact_phone_number), '') is not null
       and nullif(trim(v_pet_parent_profile.emergency_contact_phone_country_code), '') is not null then
      v_pp_emergency_phone_display :=
        trim(v_pet_parent_profile.emergency_contact_phone_country_code)
        || ' '
        || trim(v_pet_parent_profile.emergency_contact_phone_number);
    else
      v_pp_emergency_phone_display := null;
    end if;
  else
    v_pp_emergency_phone_display := v_pp_emergency_phone_e164;
  end if;

  v_pp_emergency_relationship := public.emergency_contact_relationship_from_details(v_pet_parent_profile.details);

  v_preferred_vet := null;
  if coalesce(v_pet_parent_profile.share_preferred_vet_during_booking, true) then
    v_preferred_vet := public.preferred_vet_clinic_json(v_pet_parent_profile);
  end if;

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
    ),
    'pet_parent_emergency',
    jsonb_build_object(
      'name', v_pp_emergency_name,
      'phone_e164', v_pp_emergency_phone_e164,
      'phone_display', coalesce(v_pp_emergency_phone_display, v_pp_emergency_phone_e164),
      'relationship', v_pp_emergency_relationship
    ),
    'preferred_vet', v_preferred_vet,
    'share_preferred_vet', coalesce(v_pet_parent_profile.share_preferred_vet_during_booking, true)
  );
end;
$$;
