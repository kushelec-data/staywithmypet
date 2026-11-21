-- Optional lifecycle classification after Reminder 2.
-- Independent from auth.users, profiles.role, and newsletter consent.
-- Service-role only. Do not overwrite profiles.role or ban/delete accounts.

create table if not exists public.role_selection_lifecycle (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null check (status in ('inactive_role_unselected', 'cleared')),
  campaign_id text not null default 'role_selection_reminder_v1',
  classified_at timestamptz not null default now(),
  cleared_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists role_selection_lifecycle_status_idx
  on public.role_selection_lifecycle (status);

alter table public.role_selection_lifecycle enable row level security;

revoke all on table public.role_selection_lifecycle from anon, authenticated;
