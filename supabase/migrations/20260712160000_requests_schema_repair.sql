-- Permanent repair for requests direction columns + non-recursive RLS.
-- Production: prefer supabase/RUN_THIS_requests_repair.sql in SQL editor.

alter table public.requests
  add column if not exists sender_id uuid references public.profiles (id) on delete cascade;

alter table public.requests
  add column if not exists receiver_id uuid references public.profiles (id) on delete cascade;

do $$
declare
  col text;
begin
  foreach col in array array['requester_id', 'owner_id', 'initiated_by_id'] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'requests'
        and column_name = col
        and is_nullable = 'NO'
    ) then
      execute format(
        'alter table public.requests alter column %I drop not null',
        col
      );
    end if;
  end loop;
end $$;

create or replace function public.requests_require_direction()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id is null or new.receiver_id is null then
    raise exception 'sender_id and receiver_id are required';
  end if;
  return new;
end;
$$;

drop trigger if exists requests_set_participants on public.requests;
drop trigger if exists requests_set_pet_parent on public.requests;
drop trigger if exists requests_require_direction on public.requests;

create trigger requests_require_direction
before insert on public.requests
for each row execute function public.requests_require_direction();

grant select, insert, update on public.requests to authenticated;
