-- Extended pet fields in details jsonb (fallback when individual columns are missing)
alter table public.pets
  add column if not exists details jsonb not null default '{}'::jsonb;

-- Backfill from profile_details if that column exists from an earlier migration
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pets' and column_name = 'profile_details'
  ) then
    update public.pets
    set details = profile_details
    where details = '{}'::jsonb and profile_details is not null and profile_details <> '{}'::jsonb;
  end if;
end $$;
