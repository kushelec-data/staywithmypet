alter table public.email_campaigns
  drop constraint if exists email_campaigns_status_check;

alter table public.email_campaigns
  add constraint email_campaigns_status_check
  check (status in (
    'draft',
    'test_sent',
    'scheduled',
    'sending',
    'partially_sent',
    'sent',
    'failed',
    'cancelled'
  ));

alter table public.email_campaigns
  add column if not exists scheduled_at timestamptz,
  add column if not exists scheduled_timezone text,
  add column if not exists scheduled_by uuid references public.profiles (id) on delete set null,
  add column if not exists sent_at timestamptz;

create index if not exists email_campaigns_due_scheduled_idx
  on public.email_campaigns (scheduled_at)
  where status = 'scheduled';
