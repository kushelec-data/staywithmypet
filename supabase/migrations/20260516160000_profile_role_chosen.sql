-- Track explicit role selection during onboarding (role column alone has a default)
alter table public.profiles
  add column if not exists role_chosen_at timestamptz;

-- Existing users keep access without re-onboarding
update public.profiles
set role_chosen_at = coalesce(updated_at, created_at, timezone('utc', now()))
where role_chosen_at is null;
