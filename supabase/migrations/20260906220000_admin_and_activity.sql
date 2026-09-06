-- Admin allowlist (service-role only). Users cannot self-grant via the client.
create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  created_by text
);

alter table public.admin_users enable row level security;

-- No policies for authenticated/anon: only service_role bypasses RLS.

comment on table public.admin_users is
  'Approved admin dashboard users. Grant/revoke only via SQL or service role.';

-- Initial admin: Kush Chadha listing account (existing Supabase Auth user).
insert into public.admin_users (user_id, created_by)
select id, 'migration:20260906220000'
from public.profiles
where id = '0979d7ef-8766-4a0c-847c-9825516a7360'
on conflict (user_id) do nothing;

-- First-party product activity (no message bodies).
create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  entity_type text,
  entity_id uuid,
  page_path text,
  metadata jsonb not null default '{}'::jsonb,
  session_id text,
  created_at timestamptz not null default timezone('utc', now())
);

create index user_activity_events_user_created_idx
  on public.user_activity_events (user_id, created_at desc);

create index user_activity_events_type_created_idx
  on public.user_activity_events (event_type, created_at desc);

create index user_activity_events_path_created_idx
  on public.user_activity_events (page_path, created_at desc)
  where page_path is not null;

alter table public.user_activity_events enable row level security;

-- Users may insert their own events only. No select/update/delete for authenticated.
create policy user_activity_events_insert_own
  on public.user_activity_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- Admin list indexes
create index if not exists requests_created_at_idx on public.requests (created_at desc);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);
create index if not exists conversations_created_at_idx on public.conversations (created_at desc);
