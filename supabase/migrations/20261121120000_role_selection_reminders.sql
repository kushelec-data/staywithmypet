-- Isolated role-selection reminder campaign (role_selection_reminder_v1).
-- Independent from profile_completion_reminder_* (Day 5/Day 10),
-- listing_profile_completion_events, and email_campaigns.
-- Service-role only. One customer email per user per stage.
-- Reminder 2 stays unused until copy is approved.
-- Retry only failed_before_acceptance. Never auto-retry sending or outcome_unknown.

create table if not exists public.role_selection_reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  campaign_id text not null default 'role_selection_reminder_v1',
  stage integer not null check (stage in (1, 2)),
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
  cohort text check (cohort in ('organic', 'historical')),
  scheduled_for timestamptz not null,
  claimed_at timestamptz,
  sent_at timestamptz,
  attempt_count integer not null default 0,
  last_error text,
  smtp_message_id text,
  smtp_response text,
  smtp_accepted_count integer,
  smtp_rejected_count integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, user_id, stage)
);

create index if not exists role_selection_reminder_events_status_idx
  on public.role_selection_reminder_events (status, scheduled_for);

create index if not exists role_selection_reminder_events_sent_at_idx
  on public.role_selection_reminder_events (sent_at);

alter table public.role_selection_reminder_events enable row level security;

revoke all on table public.role_selection_reminder_events from anon, authenticated;
