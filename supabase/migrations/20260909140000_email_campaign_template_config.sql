-- Store campaign template configuration (sponsor URLs, etc.) separately from rendered HTML.

alter table public.email_campaigns
  add column if not exists template_config jsonb;
