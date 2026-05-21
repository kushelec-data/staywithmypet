-- Pet availability calendar + structured location (Google Places compatible)

alter table public.pets
  add column if not exists availability_dates text[] not null default '{}',
  add column if not exists address text,
  add column if not exists latitude numeric(11, 8),
  add column if not exists longitude numeric(11, 8);

alter table public.profiles
  add column if not exists address text,
  add column if not exists latitude numeric(11, 8),
  add column if not exists longitude numeric(11, 8);

comment on column public.pets.availability_dates is 'ISO date strings YYYY-MM-DD when pet care is available';
