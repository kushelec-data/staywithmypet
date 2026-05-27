-- Ensure profile_role enum and profiles.role exist (some DBs were created without them)

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type public.profile_role as enum ('pet_parent', 'pet_friend', 'both');
  end if;
end $$;

alter table public.profiles
  add column if not exists role public.profile_role not null default 'pet_friend';

alter table public.profiles
  add column if not exists role_chosen_at timestamptz;

create index if not exists profiles_role_idx on public.profiles (role);

-- Existing rows: mark role as chosen so they are not forced through onboarding
update public.profiles
set role_chosen_at = coalesce(role_chosen_at, updated_at, created_at, timezone('utc', now()))
where role_chosen_at is null;
