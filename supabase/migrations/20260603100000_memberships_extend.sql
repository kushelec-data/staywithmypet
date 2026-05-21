-- Extend user_memberships toward memberships spec (Stripe-ready, dual-role).
-- Table name stays user_memberships (no duplicate memberships table).
-- profiles.active_mode = UI-only current_mode (see 20260516180000_profiles_active_mode.sql).

-- Status: active | inactive | cancelled | expired | trialing (default inactive for new rows)
alter type public.membership_status add value if not exists 'inactive';
alter type public.membership_status add value if not exists 'trialing';

alter table public.user_memberships
  add column if not exists plan_name text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text;

comment on column public.user_memberships.plan_name is
  'Display name at purchase; may differ from catalog after promos.';
comment on column public.user_memberships.stripe_customer_id is
  'Stripe Customer id for this user (per role row until unified billing).';
comment on column public.user_memberships.stripe_subscription_id is
  'Stripe Subscription id when on recurring billing.';
comment on column public.user_memberships.stripe_price_id is
  'Stripe Price id for the subscribed plan.';

-- Timestamptz for start/end (was date)
alter table public.user_memberships
  alter column start_date type timestamptz using (
    coalesce(start_date::timestamptz, timezone('utc', now()))
  ),
  alter column end_date type timestamptz using (
    case
      when end_date is null then null
      else end_date::timestamptz + interval '23 hours 59 minutes 59.999 seconds'
    end
  );

alter table public.user_memberships
  alter column status set default 'inactive';

-- Backfill plan_name from plan_id slug where missing
update public.user_memberships um
set plan_name = coalesce(
  um.plan_name,
  initcap(replace(replace(um.plan_id, '-owner', ''), '-friend', ''))
)
where um.plan_name is null or trim(um.plan_name) = '';

comment on table public.user_memberships is
  'Dual-role paid memberships (spec: memberships). UNIQUE(user_id, role). membership.role gates paid actions; profiles.active_mode is UI only.';

comment on column public.profiles.active_mode is
  'UI-only dashboard mode (pet_parent|pet_friend). User spec: current_mode — same semantics, keep active_mode in app code.';

-- Mental test cases (dual-role membership):
-- 1) Parent-only: one row role=pet_parent active → parent paid actions OK, friend actions need friend membership.
-- 2) Friend-only: one row role=pet_friend active → friend paid OK, parent actions need parent membership.
-- 3) Dual active: two rows both active|trialing → switch active_mode anytime; gating uses membership.role per action.
-- 4) Free/inactive: no row or status inactive/expired/cancelled → browse/profile/favourites OK; paid actions blocked for that role.
