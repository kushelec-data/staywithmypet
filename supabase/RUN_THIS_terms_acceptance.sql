-- Run in Supabase SQL editor if Terms acceptance inserts fail during signup,
-- membership activation, or care request submission.
-- Idempotent: safe to run multiple times.
-- See also: supabase/migrations/20260712150000_terms_acceptance.sql

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

create table if not exists public.terms_acceptance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  acceptance_context text not null,
  membership_role text null check (membership_role in ('pet_parent', 'pet_friend')),
  booking_id uuid null references public.bookings (id) on delete set null,
  request_id uuid null references public.requests (id) on delete set null,
  plan_id text null,
  coupon_code text null,
  ip_address text null,
  user_agent text null,
  created_at timestamptz not null default now(),
  constraint terms_acceptance_context_check check (
    acceptance_context in (
      'signup',
      'membership_coupon_activation',
      'membership_checkout',
      'booking_pet_parent',
      'booking_pet_friend',
      'first_listing'
    )
  )
);

create index if not exists terms_acceptance_user_id_idx
  on public.terms_acceptance (user_id);

create index if not exists terms_acceptance_user_version_idx
  on public.terms_acceptance (user_id, terms_version);

create index if not exists terms_acceptance_user_request_idx
  on public.terms_acceptance (user_id, request_id)
  where request_id is not null;

create index if not exists terms_acceptance_user_booking_idx
  on public.terms_acceptance (user_id, booking_id)
  where booking_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.terms_acceptance enable row level security;

drop policy if exists "terms_acceptance_select_own" on public.terms_acceptance;
create policy "terms_acceptance_select_own"
  on public.terms_acceptance for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "terms_acceptance_insert_own" on public.terms_acceptance;
create policy "terms_acceptance_insert_own"
  on public.terms_acceptance for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "terms_acceptance_update_own" on public.terms_acceptance;
create policy "terms_acceptance_update_own"
  on public.terms_acceptance for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (new tables are not covered by older blanket grants)
-- ---------------------------------------------------------------------------

grant select, insert, update on public.terms_acceptance to authenticated;
grant all on public.terms_acceptance to service_role;

-- ---------------------------------------------------------------------------
-- PostgREST schema reload
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
