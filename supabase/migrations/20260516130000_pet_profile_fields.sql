-- Pet profile fields for parent listings
alter table public.pets
  add column if not exists size_label text,
  add column if not exists temperament text[] not null default '{}',
  add column if not exists care_needs text,
  add column if not exists availability text;
