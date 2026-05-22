-- Store Stripe Checkout Session id on membership row (idempotency / support).

alter table public.user_memberships
  add column if not exists stripe_checkout_session_id text;

comment on column public.user_memberships.stripe_checkout_session_id is
  'Stripe Checkout Session id that activated or last updated this row.';

create index if not exists user_memberships_stripe_checkout_session_id_idx
  on public.user_memberships (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
