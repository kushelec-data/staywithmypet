-- Allow tracked website (non-event, non-sponsor) click tokens.

alter table public.email_campaign_click_tokens
  drop constraint if exists email_campaign_click_tokens_link_type_check;

alter table public.email_campaign_click_tokens
  add constraint email_campaign_click_tokens_link_type_check
  check (link_type in ('event', 'sponsor', 'site'));
