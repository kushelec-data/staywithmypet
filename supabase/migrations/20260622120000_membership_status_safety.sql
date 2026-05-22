-- Idempotent safety: enum values + stripe_checkout_session_id for membership activation.

alter type public.membership_status add value if not exists 'inactive';
alter type public.membership_status add value if not exists 'trialing';

alter table public.user_memberships
  add column if not exists stripe_checkout_session_id text;

create index if not exists user_memberships_stripe_checkout_session_id_idx
  on public.user_memberships (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
