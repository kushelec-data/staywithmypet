-- Dashboard mode separate from allowed role (role = pet_parent | pet_friend | both)
alter table public.profiles
  add column if not exists active_mode text default 'pet_parent';

update public.profiles
set active_mode = case
  when role::text = 'pet_friend' then 'pet_friend'
  when role::text = 'pet_parent' then 'pet_parent'
  when role::text = 'both' then coalesce(nullif(trim(active_mode), ''), 'pet_parent')
  else coalesce(nullif(trim(active_mode), ''), 'pet_parent')
end
where active_mode is null or trim(active_mode) = '';

alter table public.profiles
  alter column active_mode set default 'pet_parent';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_active_mode_check'
  ) then
    alter table public.profiles
      add constraint profiles_active_mode_check
      check (active_mode in ('pet_parent', 'pet_friend'));
  end if;
end $$;
