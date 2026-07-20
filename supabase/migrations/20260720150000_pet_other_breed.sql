-- Custom breed text when breed column is the Other sentinel.

alter table public.pets
  add column if not exists other_breed text;

comment on column public.pets.other_breed is 'Free-text breed when breed is Other; null for standard breeds.';
