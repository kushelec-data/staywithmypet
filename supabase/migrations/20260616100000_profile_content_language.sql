-- Primary language of user-written profile / pet listing text (en, et, ru, fi).
alter table public.profiles
  add column if not exists profile_language text;

alter table public.pets
  add column if not exists profile_language text;

comment on column public.profiles.profile_language is
  'Language of user-written profile content: en, et, ru, fi';

comment on column public.pets.profile_language is
  'Language of user-written pet profile content: en, et, ru, fi';
