-- Add spoken languages to profiles (profile setup)
alter table public.profiles
  add column if not exists languages text[] not null default '{}';

create index if not exists profiles_languages_idx on public.profiles using gin (languages);
