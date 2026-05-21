-- Dual role memberships: one row per user per role (pet_parent | pet_friend)

create type public.membership_role as enum ('pet_parent', 'pet_friend');

create type public.membership_status as enum ('active', 'cancelled', 'expired');

create table if not exists public.user_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.membership_role not null,
  plan_id text not null,
  status public.membership_status not null default 'active',
  start_date date not null default (timezone('utc', now()))::date,
  end_date date,
  auto_renew boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint user_memberships_one_per_role unique (user_id, role)
);

create index if not exists user_memberships_user_id_idx on public.user_memberships (user_id);
create index if not exists user_memberships_status_idx on public.user_memberships (status);
create index if not exists user_memberships_end_date_idx on public.user_memberships (end_date)
  where status = 'active';

create trigger user_memberships_set_updated_at
before update on public.user_memberships
for each row execute function public.set_updated_at();

comment on table public.user_memberships is
  'Paid membership per account role. A user with both roles may have two rows.';

alter table public.user_memberships enable row level security;

drop policy if exists user_memberships_select_own on public.user_memberships;
create policy user_memberships_select_own
  on public.user_memberships for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists user_memberships_insert_own on public.user_memberships;
create policy user_memberships_insert_own
  on public.user_memberships for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists user_memberships_update_own on public.user_memberships;
create policy user_memberships_update_own
  on public.user_memberships for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Backfill from legacy profiles.membership_status (single label → best-effort role row)
insert into public.user_memberships (user_id, role, plan_id, status, start_date, auto_renew)
select
  p.id,
  case
    when p.role = 'pet_friend'::public.profile_role then 'pet_friend'::public.membership_role
    else 'pet_parent'::public.membership_role
  end,
  lower(regexp_replace(trim(p.membership_status), '\s+', '-', 'g')),
  'active'::public.membership_status,
  coalesce(p.created_at::date, (timezone('utc', now()))::date),
  true
from public.profiles p
where p.membership_status is not null
  and lower(trim(p.membership_status)) not in ('', 'demo', 'free')
on conflict (user_id, role) do nothing;
