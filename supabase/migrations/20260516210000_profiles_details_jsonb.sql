-- Extended profile fields for dashboard / preferences (availability, care prefs, home)
alter table public.profiles
  add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists profiles_details_gin_idx
  on public.profiles using gin (details);

comment on column public.profiles.details is
  'JSON: availability, pet_types, care_types, home_type, has_garden, etc.';
