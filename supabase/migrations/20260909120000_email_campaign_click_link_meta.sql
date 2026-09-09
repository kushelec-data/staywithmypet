-- Distinguish event vs sponsor click tokens. Do not rewrite historical event rows.

alter table public.email_campaign_click_tokens
  add column if not exists link_type text not null default 'event',
  add column if not exists label text;

alter table public.email_campaign_click_tokens
  drop constraint if exists email_campaign_click_tokens_link_type_check;

alter table public.email_campaign_click_tokens
  add constraint email_campaign_click_tokens_link_type_check
  check (link_type in ('event', 'sponsor'));

alter table public.email_campaign_events
  add column if not exists link_type text,
  add column if not exists link_label text;
