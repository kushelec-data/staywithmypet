-- Column-level privacy for public.profiles.
-- RLS is row-level only; table GRANT SELECT previously let anon/authenticated
-- request phone, address, exact coordinates, and other private columns on
-- is_public = true rows via the PostgREST anon key.
--
-- This migration:
-- 1. Revokes table-wide SELECT from anon/authenticated
-- 2. Re-grants SELECT only on allowlisted public columns
-- 3. Adds public.public_profiles (allowlisted fields, scrubbed details, area label;
--    no numeric coordinates)
-- 4. Adds public.my_profile (owner-only, all columns) for account/setup reads
--
-- View design (PostgreSQL 15 / Supabase):
--   security_invoker = false  — view owner reads base columns that anon/authenticated
--                               are not GRANTed (details, city, location, …)
--   security_barrier = true   — view WHERE is applied before user-supplied predicates
--                               so leaky quals cannot probe other rows
--   auth.uid() still evaluates as the session user (function invoker), not the view owner.
--
-- Do not apply to production from this local change set until reviewed.
-- Booking contact remains public.get_booking_participant_contact (SECURITY DEFINER).

-- ---------------------------------------------------------------------------
-- Helpers used only inside public_profiles (pure transformers; no table reads)
-- ---------------------------------------------------------------------------

drop function if exists public.approximate_public_coordinates(text, double precision, double precision);
drop function if exists public.int32_hash_unit(text, text);

create or replace function public.sanitize_profile_details_for_public(p_details jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
  select case
    when p_details is null or jsonb_typeof(p_details) <> 'object' then '{}'::jsonb
    else p_details
      - 'emergency_contact'
      - 'emergency_contact_name'
      - 'emergency_contact_phone'
      - 'emergency_contact_phone_e164'
      - 'emergency_contact_phone_number'
      - 'emergency_contact_phone_country_code'
      - 'emergency_contact_relationship'
      - 'phone'
      - 'email'
      - 'address'
      - 'formatted_address'
      - 'payment'
      - 'stripe'
      - 'google_place_id'
      - 'latitude'
      - 'longitude'
      - 'postal_code'
      - 'street'
  end
$$;

create or replace function public.profile_public_area_label(
  p_public_location text,
  p_city text,
  p_country text,
  p_location text
)
returns text
language sql
immutable
set search_path = public
as $$
  select coalesce(
    nullif(trim(p_public_location), ''),
    nullif(
      trim(
        concat_ws(
          ', ',
          nullif(trim(p_city), ''),
          nullif(trim(p_country), '')
        )
      ),
      ''
    ),
    case
      when p_location is null or btrim(p_location) = '' then null
      when p_location ~ '[0-9]' then null
      when p_location ~* '(street|st\.|ave|avenue|road|rd\.|tee |tn |puiestee|boulevard|blvd)' then null
      else nullif(trim(p_location), '')
    end
  );
$$;

revoke all on function public.sanitize_profile_details_for_public(jsonb) from public, anon, authenticated;
revoke all on function public.profile_public_area_label(text, text, text, text) from public, anon, authenticated;

-- View callers must EXECUTE these (PG15: functions in a view run as the querying user).
grant execute on function public.sanitize_profile_details_for_public(jsonb) to anon, authenticated;
grant execute on function public.profile_public_area_label(text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------

drop view if exists public.public_profiles;
drop view if exists public.my_profile;

create view public.my_profile
with (security_barrier = true, security_invoker = false)
as
select *
from public.profiles
where id = (select auth.uid());

comment on view public.my_profile is
  'Owner-only full profile row (id = auth.uid()). security_barrier prevents user quals from scanning other rows. Not granted to anon.';

create view public.public_profiles
with (security_barrier = true, security_invoker = false)
as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.bio,
  public.profile_public_area_label(p.public_location, p.city, p.country, p.location) as location,
  public.profile_public_area_label(p.public_location, p.city, p.country, p.location) as public_location,
  p.role,
  p.active_mode,
  p.role_chosen_at,
  p.languages,
  p.is_public,
  p.rating_avg,
  p.rating_count,
  p.stay_count,
  p.created_at,
  p.updated_at,
  public.sanitize_profile_details_for_public(p.details) as details
from public.profiles p
where p.is_public = true
   or p.id = (select auth.uid());

comment on view public.public_profiles is
  'Allowlisted public/marketplace profile interface. No numeric coordinates. Hidden profiles are visible only to their owner.';

grant select on public.my_profile to authenticated;
revoke all on public.my_profile from anon, public;

grant select on public.public_profiles to anon, authenticated;
revoke insert, update, delete on public.public_profiles from anon, authenticated, public;
revoke insert, update, delete on public.my_profile from anon, authenticated, public;

do $$
begin
  grant select, insert, update, delete on table public.profiles to service_role;
  grant select on public.my_profile to service_role;
  grant select on public.public_profiles to service_role;
exception
  when undefined_object then
    null;
end $$;

-- ---------------------------------------------------------------------------
-- Column grants on public.profiles
-- ---------------------------------------------------------------------------

do $$
declare
  public_cols text[] := array[
    'id',
    'display_name',
    'avatar_url',
    'bio',
    'public_location',
    'role',
    'active_mode',
    'role_chosen_at',
    'languages',
    'is_public',
    'rating_avg',
    'rating_count',
    'stay_count',
    'created_at',
    'updated_at',
    'trust_score'
  ];
  grant_list text;
begin
  select string_agg(quote_ident(c.col), ', ' order by c.col)
  into grant_list
  from unnest(public_cols) as c(col)
  join information_schema.columns cols
    on cols.table_schema = 'public'
   and cols.table_name = 'profiles'
   and cols.column_name = c.col;

  revoke select on table public.profiles from anon, authenticated, public;

  if grant_list is not null then
    execute format('grant select (%s) on table public.profiles to anon', grant_list);
    execute format('grant select (%s) on table public.profiles to authenticated', grant_list);
  end if;
end;
$$;

-- Keep write grants for owner RLS policies (insert/update/delete unchanged).
grant insert, update, delete on table public.profiles to authenticated;

notify pgrst, 'reload schema';
