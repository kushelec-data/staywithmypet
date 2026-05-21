-- Extended pet profile fields (Create Pet Profile reference)
alter table public.pets
  add column if not exists date_of_birth date,
  add column if not exists gender text,
  add column if not exists energy_level text,
  add column if not exists requires_medication boolean not null default false,
  add column if not exists health_characteristics text,
  add column if not exists feeding_schedule text,
  add column if not exists walk_needs text,
  add column if not exists eating_habits text,
  add column if not exists positive_traits text,
  add column if not exists challenging_traits text,
  add column if not exists additional_notes text,
  add column if not exists friend_requirements text[] not null default '{}',
  add column if not exists care_location text,
  add column if not exists care_types text[] not null default '{}',
  add column if not exists profile_details jsonb not null default '{}'::jsonb;

alter table public.pet_photos
  add column if not exists media_type text not null default 'image';
