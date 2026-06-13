-- Track how a membership row was activated (Stripe checkout, test code, manual, etc.).

alter table public.user_memberships
  add column if not exists source text;

comment on column public.user_memberships.source is
  'Activation source: test_code, stripe_checkout, manual, etc.';
