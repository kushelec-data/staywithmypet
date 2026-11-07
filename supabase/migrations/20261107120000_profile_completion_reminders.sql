-- Isolated profile-completion reminder history.
-- Do not apply until the reminder workflow is explicitly approved for production.
-- Service-role only. Independent from email_campaigns and email_events.
-- Event status: sending → sent | failed_before_acceptance | outcome_unknown | skipped.
-- Retry only failed_before_acceptance. Never auto-retry sending or outcome_unknown.

create table if not exists public.profile_completion_reminder_sequences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'stopped_complete', 'exhausted', 'ineligible')),
  cohort text not null check (cohort in ('organic', 'historical')),
  registered_at timestamptz not null,
  first_sent_at timestamptz,
  second_sent_at timestamptz,
  stopped_at timestamptz,
  stop_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profile_completion_reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stage text not null check (stage in ('first', 'second')),
  unique_key text not null unique,
  status text not null check (status in (
    'pending',
    'sending',
    'sent',
    'skipped',
    'failed_before_acceptance',
    'outcome_unknown'
  )),
  skip_reason text,
  locale text,
  email_role text,
  scheduled_for timestamptz not null,
  claimed_at timestamptz,
  sent_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, stage)
);

create index if not exists profile_completion_reminder_events_status_idx
  on public.profile_completion_reminder_events (status, scheduled_for);

create index if not exists profile_completion_reminder_events_sent_at_idx
  on public.profile_completion_reminder_events (sent_at);

alter table public.profile_completion_reminder_sequences enable row level security;
alter table public.profile_completion_reminder_events enable row level security;

revoke all on table public.profile_completion_reminder_sequences from anon, authenticated;
revoke all on table public.profile_completion_reminder_events from anon, authenticated;
