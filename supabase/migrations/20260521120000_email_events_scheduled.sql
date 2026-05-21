-- Scheduled transactional emails (e.g. review reminders ~12h after booking complete)
alter table public.email_events
  alter column sent_at drop not null;

alter table public.email_events
  add column if not exists scheduled_for timestamptz;

create index if not exists email_events_scheduled_due_idx
  on public.email_events (scheduled_for)
  where sent_at is null and scheduled_for is not null;
