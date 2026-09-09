-- Bulk send: extra statuses, lease lock, failed_at, unsubscribe list.

alter table public.email_campaigns
  drop constraint if exists email_campaigns_status_check;

alter table public.email_campaigns
  add constraint email_campaigns_status_check
  check (status in (
    'draft',
    'test_sent',
    'sending',
    'partially_sent',
    'sent',
    'failed',
    'cancelled'
  ));

alter table public.email_campaigns
  add column if not exists send_lease_id text,
  add column if not exists send_lease_until timestamptz;

alter table public.email_campaign_recipients
  drop constraint if exists email_campaign_recipients_status_check;

alter table public.email_campaign_recipients
  add constraint email_campaign_recipients_status_check
  check (status in ('pending', 'sending', 'sent', 'failed'));

alter table public.email_campaign_recipients
  add column if not exists failed_at timestamptz,
  add column if not exists unsubscribe_token text unique;

create unique index if not exists email_campaign_recipients_unsub_token_idx
  on public.email_campaign_recipients (unsubscribe_token)
  where unsubscribe_token is not null;

create table if not exists public.email_marketing_unsubscribes (
  email text primary key,
  unsubscribed_at timestamptz not null default timezone('utc', now()),
  source text not null default 'campaign_link'
);

alter table public.email_marketing_unsubscribes enable row level security;
revoke all on public.email_marketing_unsubscribes from anon, authenticated;
grant all on public.email_marketing_unsubscribes to service_role;

comment on table public.email_marketing_unsubscribes is
  'Emails that opted out of Stay With My Pet marketing campaigns. Checked before bulk send.';
