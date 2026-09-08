-- Admin email campaigns (SpaceMail/Nodemailer). Service-role only.
-- Tracking tokens are opaque; no SMTP credentials stored.

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'test_sent', 'sending', 'sent', 'cancelled')),
  subject_en text not null,
  subject_et text not null,
  html_en text not null,
  html_et text not null,
  template_key text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  display_name text not null,
  email text not null,
  language text not null check (language in ('en', 'et')),
  open_token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  first_opened_at timestamptz,
  last_opened_at timestamptz,
  first_clicked_at timestamptz,
  last_clicked_at timestamptz,
  click_count integer not null default 0,
  last_clicked_link_key text,
  failure_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (campaign_id, email)
);

create table if not exists public.email_campaign_click_tokens (
  token text primary key,
  recipient_id uuid not null references public.email_campaign_recipients (id) on delete cascade,
  link_key text not null,
  destination_url text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (recipient_id, link_key)
);

create table if not exists public.email_campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  recipient_id uuid not null references public.email_campaign_recipients (id) on delete cascade,
  event_type text not null check (event_type in ('sent', 'opened', 'clicked', 'failed')),
  link_key text,
  destination_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create index email_campaigns_created_at_idx
  on public.email_campaigns (created_at desc);

create index email_campaign_recipients_campaign_idx
  on public.email_campaign_recipients (campaign_id);

create index email_campaign_events_recipient_created_idx
  on public.email_campaign_events (recipient_id, created_at desc);

create index email_campaign_events_campaign_type_idx
  on public.email_campaign_events (campaign_id, event_type, created_at desc);

alter table public.email_campaigns enable row level security;
alter table public.email_campaign_recipients enable row level security;
alter table public.email_campaign_click_tokens enable row level security;
alter table public.email_campaign_events enable row level security;

-- No anon/authenticated policies: only service_role bypasses RLS.
revoke all on public.email_campaigns from anon, authenticated;
revoke all on public.email_campaign_recipients from anon, authenticated;
revoke all on public.email_campaign_click_tokens from anon, authenticated;
revoke all on public.email_campaign_events from anon, authenticated;

grant all on public.email_campaigns to service_role;
grant all on public.email_campaign_recipients to service_role;
grant all on public.email_campaign_click_tokens to service_role;
grant all on public.email_campaign_events to service_role;

comment on table public.email_campaigns is
  'Admin marketing/community email campaigns. Managed via service role after admin_users check.';
comment on table public.email_campaign_recipients is
  'Per-recipient send/open/click stats. open_token is opaque and must not be exposed in analytics unnecessarily.';
comment on table public.email_campaign_click_tokens is
  'Opaque click tokens mapping to Facebook (or other) destinations. No emails or user UUIDs in public URLs.';
comment on table public.email_campaign_events is
  'Append-only campaign events (sent/opened/clicked/failed). No SMTP secrets or message bodies.';
