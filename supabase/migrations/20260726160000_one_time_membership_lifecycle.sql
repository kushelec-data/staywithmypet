-- One-Time membership lifecycle: booking linkage, consumption, and restart tracking.

alter table public.user_memberships
  add column if not exists linked_booking_id uuid references public.bookings (id) on delete set null,
  add column if not exists consumed_at timestamptz,
  add column if not exists cancellation_restart_used boolean not null default false;

comment on column public.user_memberships.linked_booking_id is
  'One-Time plan: first confirmed booking linked to this purchase.';
comment on column public.user_memberships.consumed_at is
  'When a One-Time entitlement was fully used (booking completed or exhausted).';
comment on column public.user_memberships.cancellation_restart_used is
  'One-Time plan: whether the single post-cancellation 1-month restart was already applied.';

create index if not exists user_memberships_linked_booking_id_idx
  on public.user_memberships (linked_booking_id)
  where linked_booking_id is not null;

-- Request cancellation timestamp (bookings already have cancelled_at).
alter table public.requests
  add column if not exists cancelled_at timestamptz;

comment on column public.requests.cancelled_at is
  'When a pending request was cancelled by the sender (not decline by receiver).';
