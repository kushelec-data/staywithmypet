-- Structured Google Places location on profiles (private address + public area label)

alter table public.profiles
  add column if not exists formatted_address text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists postal_code text,
  add column if not exists google_place_id text,
  add column if not exists public_location text;

comment on column public.profiles.formatted_address is 'Private full address from Google Places (never public)';
comment on column public.profiles.public_location is 'Public city/area label e.g. Viimsi, Estonia';
comment on column public.profiles.google_place_id is 'Google Places place_id for the selected address';

create index if not exists profiles_public_location_idx
  on public.profiles (public_location)
  where public_location is not null;

create index if not exists profiles_google_place_id_idx
  on public.profiles (google_place_id)
  where google_place_id is not null;

-- Backfill public_location from legacy location where possible
update public.profiles
set public_location = trim(location)
where public_location is null
  and location is not null
  and trim(location) <> '';

-- Backfill formatted_address from legacy address column
update public.profiles
set formatted_address = trim(address)
where formatted_address is null
  and address is not null
  and trim(address) <> '';
