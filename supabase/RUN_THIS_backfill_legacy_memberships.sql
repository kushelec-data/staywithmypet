-- =============================================================================
-- LEGACY MEMBERSHIP BACKFILL (HARDENED PREVIEW) — Supabase SQL Editor
-- =============================================================================
-- Goal: propose missing user_memberships rows for legacy paid members.
--
-- SAFETY (read before running anything):
--   • PREVIEW ONLY by default — INSERT block is commented out at the bottom.
--   • Never updates or replaces existing user_memberships rows (any status).
--   • Inserts only when NO row exists for the exact (user_id, role).
--   • profiles.membership_status alone is NOT treated as proof of a current
--     valid membership — it only suggests which catalog plan label may apply.
--   • role = both does NOT auto-grant both roles; dual rows require explicit
--     legacy proof in profiles.details (or a role-specific plan slug suffix).
--
-- Date source priority (per role):
--   1) profiles.details role-specific membership dates (JSON paths below)
--   2) profiles.details generic membership start/end fields
--   3) email_events.membership_activated (sent_at / created_at)
--   4) sibling user_memberships row dates (ONLY when dual-role proof exists)
--   5) profiles.role_chosen_at (single-role profiles only)
--   6) profiles.created_at (last resort — flagged in preview)
--
-- End date convention (matches src/lib/stripe-plans.ts computeMembershipEndDate):
--   one_time  → start + 1 month
--   3_months  → start + 3 months
--   12_months → start + 1 year
--
-- user_memberships columns used by this script (core only — 20260602100000):
--   id, user_id, role, plan_id, status, start_date, end_date, auto_renew,
--   created_at, updated_at
-- Optional columns (plan_name, source, stripe_*) are NOT referenced — production
-- may not have them. Stripe corroboration uses profiles.details JSON only.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1 — PREVIEW (run this block only first)
-- -----------------------------------------------------------------------------
with legacy_profiles as (
  select
    p.id as user_id,
    p.display_name,
    p.role as profile_role,
    p.membership_status as legacy_membership_status,
    p.created_at,
    p.role_chosen_at,
    p.details,
    lower(trim(p.membership_status)) as status_lower,
    lower(regexp_replace(trim(p.membership_status), '\s+', '-', 'g')) as status_slug
  from public.profiles p
  where p.membership_status is not null
    and trim(p.membership_status) <> ''
    and lower(trim(p.membership_status)) not in ('demo', 'free')
),
paid_intervals as (
  select
    lp.*,
    case
      when lp.status_lower in ('3 month', '3 months')
        or lp.status_slug in (
          '3-month', '3month', '3-months',
          '3-month-owner', '3-month-friend'
        ) then '3_months'
      when lp.status_lower in ('1 year', '12 month', '12 months')
        or lp.status_slug in (
          '1-year', '1year', '12-month', '12-months',
          '1-year-owner', '1-year-friend'
        ) then '12_months'
      when lp.status_lower in ('one time', 'one-time')
        or lp.status_slug in (
          'one-time', 'onetime',
          'one-time-owner', 'one-time-friend'
        ) then 'one_time'
      else null
    end as billing_interval
  from legacy_profiles lp
),
details_dates as (
  select
    pi.*,
    nullif(trim(pi.details #>> '{membership,pet_parent,start_date}'), '') as details_parent_start_raw,
    nullif(trim(pi.details #>> '{membership,pet_friend,start_date}'), '') as details_friend_start_raw,
    nullif(trim(pi.details #>> '{memberships,pet_parent,start_date}'), '') as details_parent_start_alt_raw,
    nullif(trim(pi.details #>> '{memberships,pet_friend,start_date}'), '') as details_friend_start_alt_raw,
    nullif(trim(pi.details #>> '{membership,start_date}'), '') as details_generic_start_raw,
    nullif(trim(pi.details #>> '{membership_start_date}'), '') as details_membership_start_raw,
    nullif(trim(pi.details #>> '{membership,pet_parent,end_date}'), '') as details_parent_end_raw,
    nullif(trim(pi.details #>> '{membership,pet_friend,end_date}'), '') as details_friend_end_raw,
    nullif(trim(pi.details #>> '{memberships,pet_parent,end_date}'), '') as details_parent_end_alt_raw,
    nullif(trim(pi.details #>> '{memberships,pet_friend,end_date}'), '') as details_friend_end_alt_raw,
    nullif(trim(pi.details #>> '{membership,end_date}'), '') as details_generic_end_raw,
    nullif(trim(pi.details #>> '{membership_end_date}'), '') as details_membership_end_raw,
    nullif(trim(pi.details #>> '{membership,activated_at}'), '') as details_activated_at_raw,
    nullif(trim(pi.details #>> '{membership,role}'), '') as details_membership_role_raw,
    nullif(trim(pi.details #>> '{membership_role}'), '') as details_membership_role_alt_raw,
    nullif(trim(pi.details #>> '{stripe_checkout_session_id}'), '') as details_stripe_checkout_raw,
    nullif(trim(pi.details #>> '{stripe_customer_id}'), '') as details_stripe_customer_raw,
    nullif(trim(pi.details #>> '{stripe_subscription_id}'), '') as details_stripe_subscription_raw,
    case
      when pi.details ? 'memberships'
        and (pi.details -> 'memberships') ? 'pet_parent'
        and (pi.details -> 'memberships') ? 'pet_friend' then true
      when pi.details ? 'membership'
        and (pi.details -> 'membership') ? 'pet_parent'
        and (pi.details -> 'membership') ? 'pet_friend' then true
      when lower(coalesce(pi.details #>> '{membership_role}', pi.details #>> '{membership,role}', '')) in (
        'both', 'pet_parent_and_pet_friend', 'parent_and_friend', 'dual'
      ) then true
      when pi.details ? 'membership_roles'
        and (pi.details -> 'membership_roles') @> '["pet_parent","pet_friend"]'::jsonb then true
      when pi.details ? 'membership_roles'
        and (pi.details -> 'membership_roles') @> '["pet_friend","pet_parent"]'::jsonb then true
      else false
    end as dual_role_proven_in_details,
    case
      when pi.status_slug like '%-owner' or pi.status_slug like '%pet-parent%' then true
      else false
    end as slug_proves_parent,
    case
      when pi.status_slug like '%-friend' or pi.status_slug like '%pet-friend%' then true
      else false
    end as slug_proves_friend
  from paid_intervals pi
  where pi.billing_interval is not null
),
email_activation as (
  select
    ee.user_id,
    min(coalesce(ee.sent_at, ee.created_at)) as activated_at
  from public.email_events ee
  where ee.event_type = 'membership_activated'
  group by ee.user_id
),
existing_memberships as (
  select
    um.user_id,
    um.role,
    um.status,
    um.plan_id,
    um.start_date,
    um.end_date
  from public.user_memberships um
),
sibling_membership as (
  select
    um.user_id,
    max(um.start_date) filter (where um.role = 'pet_parent'::public.membership_role) as sibling_parent_start,
    max(um.end_date) filter (where um.role = 'pet_parent'::public.membership_role) as sibling_parent_end,
    max(um.start_date) filter (where um.role = 'pet_friend'::public.membership_role) as sibling_friend_start,
    max(um.end_date) filter (where um.role = 'pet_friend'::public.membership_role) as sibling_friend_end
  from public.user_memberships um
  group by um.user_id
),
role_targets as (
  -- Explicit slug suffix always wins over profile.role.
  select
    dd.user_id,
    dd.display_name,
    dd.profile_role,
    dd.legacy_membership_status,
    dd.billing_interval,
    dd.status_slug,
    dd.dual_role_proven_in_details,
    dd.slug_proves_parent,
    dd.slug_proves_friend,
    dd.details,
    dd.created_at,
    dd.role_chosen_at,
    dd.details_parent_start_raw,
    dd.details_friend_start_raw,
    dd.details_parent_start_alt_raw,
    dd.details_friend_start_alt_raw,
    dd.details_generic_start_raw,
    dd.details_membership_start_raw,
    dd.details_parent_end_raw,
    dd.details_friend_end_raw,
    dd.details_parent_end_alt_raw,
    dd.details_friend_end_alt_raw,
    dd.details_generic_end_raw,
    dd.details_membership_end_raw,
    dd.details_activated_at_raw,
    dd.details_stripe_checkout_raw,
    dd.details_stripe_customer_raw,
    dd.details_stripe_subscription_raw,
    'pet_parent'::public.membership_role as membership_role,
    'slug_suffix_owner'::text as role_evidence
  from details_dates dd
  where dd.slug_proves_parent
    and not dd.slug_proves_friend

  union all

  select
    dd.user_id,
    dd.display_name,
    dd.profile_role,
    dd.legacy_membership_status,
    dd.billing_interval,
    dd.status_slug,
    dd.dual_role_proven_in_details,
    dd.slug_proves_parent,
    dd.slug_proves_friend,
    dd.details,
    dd.created_at,
    dd.role_chosen_at,
    dd.details_parent_start_raw,
    dd.details_friend_start_raw,
    dd.details_parent_start_alt_raw,
    dd.details_friend_start_alt_raw,
    dd.details_generic_start_raw,
    dd.details_membership_start_raw,
    dd.details_parent_end_raw,
    dd.details_friend_end_raw,
    dd.details_parent_end_alt_raw,
    dd.details_friend_end_alt_raw,
    dd.details_generic_end_raw,
    dd.details_membership_end_raw,
    dd.details_activated_at_raw,
    dd.details_stripe_checkout_raw,
    dd.details_stripe_customer_raw,
    dd.details_stripe_subscription_raw,
    'pet_friend'::public.membership_role,
    'slug_suffix_friend'
  from details_dates dd
  where dd.slug_proves_friend
    and not dd.slug_proves_parent

  union all

  -- Single-role profiles: map profile.role directly.
  select
    dd.user_id,
    dd.display_name,
    dd.profile_role,
    dd.legacy_membership_status,
    dd.billing_interval,
    dd.status_slug,
    dd.dual_role_proven_in_details,
    dd.slug_proves_parent,
    dd.slug_proves_friend,
    dd.details,
    dd.created_at,
    dd.role_chosen_at,
    dd.details_parent_start_raw,
    dd.details_friend_start_raw,
    dd.details_parent_start_alt_raw,
    dd.details_friend_start_alt_raw,
    dd.details_generic_start_raw,
    dd.details_membership_start_raw,
    dd.details_parent_end_raw,
    dd.details_friend_end_raw,
    dd.details_parent_end_alt_raw,
    dd.details_friend_end_alt_raw,
    dd.details_generic_end_raw,
    dd.details_membership_end_raw,
    dd.details_activated_at_raw,
    dd.details_stripe_checkout_raw,
    dd.details_stripe_customer_raw,
    dd.details_stripe_subscription_raw,
    'pet_parent'::public.membership_role,
    'profile_role_pet_parent'
  from details_dates dd
  where dd.profile_role = 'pet_parent'::public.profile_role
    and not dd.slug_proves_parent
    and not dd.slug_proves_friend

  union all

  select
    dd.user_id,
    dd.display_name,
    dd.profile_role,
    dd.legacy_membership_status,
    dd.billing_interval,
    dd.status_slug,
    dd.dual_role_proven_in_details,
    dd.slug_proves_parent,
    dd.slug_proves_friend,
    dd.details,
    dd.created_at,
    dd.role_chosen_at,
    dd.details_parent_start_raw,
    dd.details_friend_start_raw,
    dd.details_parent_start_alt_raw,
    dd.details_friend_start_alt_raw,
    dd.details_generic_start_raw,
    dd.details_membership_start_raw,
    dd.details_parent_end_raw,
    dd.details_friend_end_raw,
    dd.details_parent_end_alt_raw,
    dd.details_friend_end_alt_raw,
    dd.details_generic_end_raw,
    dd.details_membership_end_raw,
    dd.details_activated_at_raw,
    dd.details_stripe_checkout_raw,
    dd.details_stripe_customer_raw,
    dd.details_stripe_subscription_raw,
    'pet_friend'::public.membership_role,
    'profile_role_pet_friend'
  from details_dates dd
  where dd.profile_role = 'pet_friend'::public.profile_role
    and not dd.slug_proves_parent
    and not dd.slug_proves_friend

  union all

  -- Dual-role profiles: only when details explicitly prove both memberships.
  select
    dd.user_id,
    dd.display_name,
    dd.profile_role,
    dd.legacy_membership_status,
    dd.billing_interval,
    dd.status_slug,
    dd.dual_role_proven_in_details,
    dd.slug_proves_parent,
    dd.slug_proves_friend,
    dd.details,
    dd.created_at,
    dd.role_chosen_at,
    dd.details_parent_start_raw,
    dd.details_friend_start_raw,
    dd.details_parent_start_alt_raw,
    dd.details_friend_start_alt_raw,
    dd.details_generic_start_raw,
    dd.details_membership_start_raw,
    dd.details_parent_end_raw,
    dd.details_friend_end_raw,
    dd.details_parent_end_alt_raw,
    dd.details_friend_end_alt_raw,
    dd.details_generic_end_raw,
    dd.details_membership_end_raw,
    dd.details_activated_at_raw,
    dd.details_stripe_checkout_raw,
    dd.details_stripe_customer_raw,
    dd.details_stripe_subscription_raw,
    'pet_parent'::public.membership_role,
    'details_dual_role'
  from details_dates dd
  where dd.profile_role = 'both'::public.profile_role
    and dd.dual_role_proven_in_details
    and not dd.slug_proves_parent
    and not dd.slug_proves_friend

  union all

  select
    dd.user_id,
    dd.display_name,
    dd.profile_role,
    dd.legacy_membership_status,
    dd.billing_interval,
    dd.status_slug,
    dd.dual_role_proven_in_details,
    dd.slug_proves_parent,
    dd.slug_proves_friend,
    dd.details,
    dd.created_at,
    dd.role_chosen_at,
    dd.details_parent_start_raw,
    dd.details_friend_start_raw,
    dd.details_parent_start_alt_raw,
    dd.details_friend_start_alt_raw,
    dd.details_generic_start_raw,
    dd.details_membership_start_raw,
    dd.details_parent_end_raw,
    dd.details_friend_end_raw,
    dd.details_parent_end_alt_raw,
    dd.details_friend_end_alt_raw,
    dd.details_generic_end_raw,
    dd.details_membership_end_raw,
    dd.details_activated_at_raw,
    dd.details_stripe_checkout_raw,
    dd.details_stripe_customer_raw,
    dd.details_stripe_subscription_raw,
    'pet_friend'::public.membership_role,
    'details_dual_role'
  from details_dates dd
  where dd.profile_role = 'both'::public.profile_role
    and dd.dual_role_proven_in_details
    and not dd.slug_proves_parent
    and not dd.slug_proves_friend
),
resolved_base as (
  select
    rt.*,
    em.activated_at as email_activation_at,
    sm.sibling_parent_start,
    sm.sibling_parent_end,
    sm.sibling_friend_start,
    sm.sibling_friend_end,
    case rt.membership_role
      when 'pet_parent' then
        coalesce(
          rt.details_parent_start_raw,
          rt.details_parent_start_alt_raw,
          rt.details_generic_start_raw,
          rt.details_membership_start_raw,
          rt.details_activated_at_raw
        )
      when 'pet_friend' then
        coalesce(
          rt.details_friend_start_raw,
          rt.details_friend_start_alt_raw,
          rt.details_generic_start_raw,
          rt.details_membership_start_raw,
          rt.details_activated_at_raw
        )
    end as details_start_raw,
    case rt.membership_role
      when 'pet_parent' then
        coalesce(
          rt.details_parent_end_raw,
          rt.details_parent_end_alt_raw,
          rt.details_generic_end_raw,
          rt.details_membership_end_raw
        )
      when 'pet_friend' then
        coalesce(
          rt.details_friend_end_raw,
          rt.details_friend_end_alt_raw,
          rt.details_generic_end_raw,
          rt.details_membership_end_raw
        )
    end as details_end_raw,
    case rt.membership_role
      when 'pet_parent' then
        case rt.billing_interval
          when 'one_time' then 'one-time-owner'
          when '3_months' then '3-month-owner'
          when '12_months' then '1-year-owner'
        end
      when 'pet_friend' then
        case rt.billing_interval
          when 'one_time' then 'one-time-friend'
          when '3_months' then '3-month-friend'
          when '12_months' then '1-year-friend'
        end
    end as proposed_plan_id,
    case rt.billing_interval
      when 'one_time' then 'One Time'
      when '3_months' then '3 Month'
      when '12_months' then '1 Year'
    end as proposed_plan_name,
    exists (
      select 1
      from existing_memberships ex
      where ex.user_id = rt.user_id
        and ex.role = rt.membership_role
    ) as has_existing_row,
    (
      select ex.status::text
      from existing_memberships ex
      where ex.user_id = rt.user_id
        and ex.role = rt.membership_role
      limit 1
    ) as existing_status
  from role_targets rt
  left join email_activation em on em.user_id = rt.user_id
  left join sibling_membership sm on sm.user_id = rt.user_id
),
resolved as (
  select
    rb.*,
    (
      rb.details_start_raw is not null
      or rb.details_end_raw is not null
      or rb.email_activation_at is not null
      or rb.details_stripe_checkout_raw is not null
      or rb.details_stripe_customer_raw is not null
      or rb.details_stripe_subscription_raw is not null
      or (
        rb.dual_role_proven_in_details
        and (
          (rb.membership_role = 'pet_parent'::public.membership_role and rb.sibling_parent_start is not null)
          or (rb.membership_role = 'pet_friend'::public.membership_role and rb.sibling_friend_start is not null)
        )
      )
      or (
        rb.role_evidence in ('profile_role_pet_parent', 'profile_role_pet_friend')
        and rb.role_chosen_at is not null
      )
    ) as purchase_corroborated
  from resolved_base rb
),
dated as (
  select
    r.*,
    case
      when r.details_start_raw is not null then
        timezone('utc', r.details_start_raw::timestamptz)
      when r.email_activation_at is not null then
        timezone('utc', r.email_activation_at)
      when r.dual_role_proven_in_details and r.membership_role = 'pet_parent'::public.membership_role
        and r.sibling_parent_start is not null then
        timezone('utc', r.sibling_parent_start)
      when r.dual_role_proven_in_details and r.membership_role = 'pet_friend'::public.membership_role
        and r.sibling_friend_start is not null then
        timezone('utc', r.sibling_friend_start)
      when r.role_evidence in ('profile_role_pet_parent', 'profile_role_pet_friend')
        and r.role_chosen_at is not null then
        timezone('utc', r.role_chosen_at)
      when r.purchase_corroborated then
        timezone('utc', coalesce(r.created_at, now()))
      else null
    end as proposed_start_date,
    case
      when r.details_start_raw is not null then 'details_json'
      when r.email_activation_at is not null then 'email_events.membership_activated'
      when r.dual_role_proven_in_details and r.membership_role = 'pet_parent'::public.membership_role
        and r.sibling_parent_start is not null then 'sibling_user_memberships.pet_parent'
      when r.dual_role_proven_in_details and r.membership_role = 'pet_friend'::public.membership_role
        and r.sibling_friend_start is not null then 'sibling_user_memberships.pet_friend'
      when r.role_evidence in ('profile_role_pet_parent', 'profile_role_pet_friend')
        and r.role_chosen_at is not null then 'profiles.role_chosen_at'
      when r.purchase_corroborated then 'profiles.created_at_fallback'
      else null
    end as start_date_source
  from resolved r
),
with_end_dates as (
  select
    d.*,
    case
      when d.details_end_raw is not null then timezone('utc', d.details_end_raw::timestamptz)
      when d.proposed_start_date is not null then
        case d.billing_interval
          when 'one_time' then d.proposed_start_date + interval '1 month'
          when '3_months' then d.proposed_start_date + interval '3 months'
          when '12_months' then d.proposed_start_date + interval '1 year'
        end
      else null
    end as proposed_end_date,
    case
      when d.details_end_raw is not null then 'details_json'
      when d.proposed_start_date is not null then 'computed_from_billing_interval'
      else null
    end as end_date_source
  from dated d
),
classified as (
  select
    w.*,
    case
      when w.has_existing_row then 'conflicting existing membership'
      when not w.purchase_corroborated then 'missing reliable start date (membership_status only)'
      when w.proposed_start_date is null then 'missing reliable start date'
      when w.start_date_source = 'profiles.created_at_fallback' then
        case
          when w.proposed_end_date is not null
            and w.proposed_end_date < timezone('utc', now()) then 'would already be expired'
          else 'missing reliable start date'
        end
      when w.proposed_end_date is not null
        and w.proposed_end_date < timezone('utc', now()) then 'would already be expired'
      else 'safe to insert'
    end as preview_classification
  from with_end_dates w
),
uncovered_both_role as (
  select
    dd.user_id,
    dd.display_name,
    dd.profile_role,
    dd.legacy_membership_status,
    null::public.membership_role as membership_role,
    'role_both_no_dual_proof'::text as role_evidence,
    null::text as proposed_plan_id,
    null::text as proposed_plan_name,
    null::timestamptz as proposed_start_date,
    null::timestamptz as proposed_end_date,
    null::text as start_date_source,
    null::text as end_date_source,
    'insufficient role evidence (role=both, no dual proof)'::text as preview_classification,
    exists (
      select 1 from public.user_memberships ex
      where ex.user_id = dd.user_id
    ) as has_existing_row,
    null::text as existing_status,
    false as purchase_corroborated,
    dd.dual_role_proven_in_details,
    null::timestamptz as email_activation_at,
    dd.details_stripe_checkout_raw
  from details_dates dd
  where dd.profile_role = 'both'::public.profile_role
    and not dd.dual_role_proven_in_details
    and not dd.slug_proves_parent
    and not dd.slug_proves_friend
)
select
  q.user_id,
  q.display_name,
  q.legacy_membership_status,
  q.profile_role,
  q.role_to_insert,
  q.role_evidence,
  q.proposed_plan_id,
  q.proposed_plan_name,
  q.proposed_start_date,
  q.proposed_end_date,
  q.start_date_source,
  q.end_date_source,
  q.preview_classification,
  q.has_existing_row,
  q.existing_status,
  q.purchase_corroborated,
  q.dual_role_proven_in_details,
  q.email_activation_at,
  q.details_stripe_checkout_raw
from (
  select
    c.user_id,
    c.display_name,
    c.legacy_membership_status,
    c.profile_role,
    c.membership_role as role_to_insert,
    c.role_evidence,
    c.proposed_plan_id,
    c.proposed_plan_name,
    c.proposed_start_date,
    c.proposed_end_date,
    c.start_date_source,
    c.end_date_source,
    c.preview_classification,
    c.has_existing_row,
    c.existing_status,
    c.purchase_corroborated,
    c.dual_role_proven_in_details,
    c.email_activation_at,
    c.details_stripe_checkout_raw
  from classified c

  union all

  select
    u.user_id,
    u.display_name,
    u.legacy_membership_status,
    u.profile_role,
    u.membership_role as role_to_insert,
    u.role_evidence,
    u.proposed_plan_id,
    u.proposed_plan_name,
    u.proposed_start_date,
    u.proposed_end_date,
    u.start_date_source,
    u.end_date_source,
    u.preview_classification,
    u.has_existing_row,
    u.existing_status,
    u.purchase_corroborated,
    u.dual_role_proven_in_details,
    u.email_activation_at,
    u.details_stripe_checkout_raw
  from uncovered_both_role u
) q
order by
  case q.preview_classification
    when 'safe to insert' then 1
    when 'would already be expired' then 2
    when 'missing reliable start date' then 3
    when 'missing reliable start date (membership_status only)' then 4
    when 'insufficient role evidence (role=both, no dual proof)' then 5
    when 'conflicting existing membership' then 6
    else 7
  end,
  q.display_name,
  q.role_to_insert;

-- -----------------------------------------------------------------------------
-- STEP 2 — INSERT (COMMENTED OUT — uncomment only after reviewing STEP 1)
-- Inserts ONLY rows classified as "safe to insert" in the preview logic above.
-- Never touches existing rows. Idempotent via ON CONFLICT (user_id, role) DO NOTHING.
-- -----------------------------------------------------------------------------
/*
with legacy_profiles as (
  select
    p.id as user_id,
    p.display_name,
    p.role as profile_role,
    p.membership_status as legacy_membership_status,
    p.created_at,
    p.role_chosen_at,
    p.details,
    lower(trim(p.membership_status)) as status_lower,
    lower(regexp_replace(trim(p.membership_status), '\s+', '-', 'g')) as status_slug
  from public.profiles p
  where p.membership_status is not null
    and trim(p.membership_status) <> ''
    and lower(trim(p.membership_status)) not in ('demo', 'free')
),
paid_intervals as (
  select
    lp.*,
    case
      when lp.status_lower in ('3 month', '3 months')
        or lp.status_slug in ('3-month', '3month', '3-months', '3-month-owner', '3-month-friend') then '3_months'
      when lp.status_lower in ('1 year', '12 month', '12 months')
        or lp.status_slug in ('1-year', '1year', '12-month', '12-months', '1-year-owner', '1-year-friend') then '12_months'
      when lp.status_lower in ('one time', 'one-time')
        or lp.status_slug in ('one-time', 'onetime', 'one-time-owner', 'one-time-friend') then 'one_time'
      else null
    end as billing_interval
  from legacy_profiles lp
),
details_dates as (
  select
    pi.*,
    nullif(trim(pi.details #>> '{membership,pet_parent,start_date}'), '') as details_parent_start_raw,
    nullif(trim(pi.details #>> '{membership,pet_friend,start_date}'), '') as details_friend_start_raw,
    nullif(trim(pi.details #>> '{memberships,pet_parent,start_date}'), '') as details_parent_start_alt_raw,
    nullif(trim(pi.details #>> '{memberships,pet_friend,start_date}'), '') as details_friend_start_alt_raw,
    nullif(trim(pi.details #>> '{membership,start_date}'), '') as details_generic_start_raw,
    nullif(trim(pi.details #>> '{membership_start_date}'), '') as details_membership_start_raw,
    nullif(trim(pi.details #>> '{membership,pet_parent,end_date}'), '') as details_parent_end_raw,
    nullif(trim(pi.details #>> '{membership,pet_friend,end_date}'), '') as details_friend_end_raw,
    nullif(trim(pi.details #>> '{memberships,pet_parent,end_date}'), '') as details_parent_end_alt_raw,
    nullif(trim(pi.details #>> '{memberships,pet_friend,end_date}'), '') as details_friend_end_alt_raw,
    nullif(trim(pi.details #>> '{membership,end_date}'), '') as details_generic_end_raw,
    nullif(trim(pi.details #>> '{membership_end_date}'), '') as details_membership_end_raw,
    nullif(trim(pi.details #>> '{membership,activated_at}'), '') as details_activated_at_raw,
    nullif(trim(pi.details #>> '{stripe_checkout_session_id}'), '') as details_stripe_checkout_raw,
    nullif(trim(pi.details #>> '{stripe_customer_id}'), '') as details_stripe_customer_raw,
    nullif(trim(pi.details #>> '{stripe_subscription_id}'), '') as details_stripe_subscription_raw,
    case
      when pi.details ? 'memberships'
        and (pi.details -> 'memberships') ? 'pet_parent'
        and (pi.details -> 'memberships') ? 'pet_friend' then true
      when pi.details ? 'membership'
        and (pi.details -> 'membership') ? 'pet_parent'
        and (pi.details -> 'membership') ? 'pet_friend' then true
      when lower(coalesce(pi.details #>> '{membership_role}', pi.details #>> '{membership,role}', '')) in (
        'both', 'pet_parent_and_pet_friend', 'parent_and_friend', 'dual'
      ) then true
      when pi.details ? 'membership_roles'
        and (pi.details -> 'membership_roles') @> '["pet_parent","pet_friend"]'::jsonb then true
      when pi.details ? 'membership_roles'
        and (pi.details -> 'membership_roles') @> '["pet_friend","pet_parent"]'::jsonb then true
      else false
    end as dual_role_proven_in_details,
    case when pi.status_slug like '%-owner' or pi.status_slug like '%pet-parent%' then true else false end as slug_proves_parent,
    case when pi.status_slug like '%-friend' or pi.status_slug like '%pet-friend%' then true else false end as slug_proves_friend
  from paid_intervals pi
  where pi.billing_interval is not null
),
email_activation as (
  select ee.user_id, min(coalesce(ee.sent_at, ee.created_at)) as activated_at
  from public.email_events ee
  where ee.event_type = 'membership_activated'
  group by ee.user_id
),
sibling_membership as (
  select
    um.user_id,
    max(um.start_date) filter (where um.role = 'pet_parent'::public.membership_role) as sibling_parent_start,
    max(um.end_date) filter (where um.role = 'pet_parent'::public.membership_role) as sibling_parent_end,
    max(um.start_date) filter (where um.role = 'pet_friend'::public.membership_role) as sibling_friend_start,
    max(um.end_date) filter (where um.role = 'pet_friend'::public.membership_role) as sibling_friend_end
  from public.user_memberships um
  group by um.user_id
),
role_targets as (
  select dd.*, 'pet_parent'::public.membership_role as membership_role, 'slug_suffix_owner'::text as role_evidence
  from details_dates dd where dd.slug_proves_parent and not dd.slug_proves_friend
  union all
  select dd.*, 'pet_friend'::public.membership_role, 'slug_suffix_friend'
  from details_dates dd where dd.slug_proves_friend and not dd.slug_proves_parent
  union all
  select dd.*, 'pet_parent'::public.membership_role, 'profile_role_pet_parent'
  from details_dates dd
  where dd.profile_role = 'pet_parent'::public.profile_role and not dd.slug_proves_parent and not dd.slug_proves_friend
  union all
  select dd.*, 'pet_friend'::public.membership_role, 'profile_role_pet_friend'
  from details_dates dd
  where dd.profile_role = 'pet_friend'::public.profile_role and not dd.slug_proves_parent and not dd.slug_proves_friend
  union all
  select dd.*, 'pet_parent'::public.membership_role, 'details_dual_role'
  from details_dates dd
  where dd.profile_role = 'both'::public.profile_role and dd.dual_role_proven_in_details
    and not dd.slug_proves_parent and not dd.slug_proves_friend
  union all
  select dd.*, 'pet_friend'::public.membership_role, 'details_dual_role'
  from details_dates dd
  where dd.profile_role = 'both'::public.profile_role and dd.dual_role_proven_in_details
    and not dd.slug_proves_parent and not dd.slug_proves_friend
),
resolved_base as (
  select
    rt.*,
    em.activated_at as email_activation_at,
    sm.sibling_parent_start,
    sm.sibling_friend_start,
    case rt.membership_role
      when 'pet_parent' then coalesce(rt.details_parent_start_raw, rt.details_parent_start_alt_raw, rt.details_generic_start_raw, rt.details_membership_start_raw, rt.details_activated_at_raw)
      when 'pet_friend' then coalesce(rt.details_friend_start_raw, rt.details_friend_start_alt_raw, rt.details_generic_start_raw, rt.details_membership_start_raw, rt.details_activated_at_raw)
    end as details_start_raw,
    case rt.membership_role
      when 'pet_parent' then coalesce(rt.details_parent_end_raw, rt.details_parent_end_alt_raw, rt.details_generic_end_raw, rt.details_membership_end_raw)
      when 'pet_friend' then coalesce(rt.details_friend_end_raw, rt.details_friend_end_alt_raw, rt.details_generic_end_raw, rt.details_membership_end_raw)
    end as details_end_raw,
    case rt.membership_role
      when 'pet_parent' then case rt.billing_interval when 'one_time' then 'one-time-owner' when '3_months' then '3-month-owner' when '12_months' then '1-year-owner' end
      when 'pet_friend' then case rt.billing_interval when 'one_time' then 'one-time-friend' when '3_months' then '3-month-friend' when '12_months' then '1-year-friend' end
    end as proposed_plan_id,
    case rt.billing_interval when 'one_time' then 'One Time' when '3_months' then '3 Month' when '12_months' then '1 Year' end as proposed_plan_name,
    exists (select 1 from public.user_memberships ex where ex.user_id = rt.user_id and ex.role = rt.membership_role) as has_existing_row
  from role_targets rt
  left join email_activation em on em.user_id = rt.user_id
  left join sibling_membership sm on sm.user_id = rt.user_id
),
resolved as (
  select
    rb.*,
    (
      rb.details_start_raw is not null
      or rb.details_end_raw is not null
      or rb.email_activation_at is not null
      or rb.details_stripe_checkout_raw is not null
      or rb.details_stripe_customer_raw is not null
      or rb.details_stripe_subscription_raw is not null
      or (
        rb.dual_role_proven_in_details
        and (
          (rb.membership_role = 'pet_parent'::public.membership_role and rb.sibling_parent_start is not null)
          or (rb.membership_role = 'pet_friend'::public.membership_role and rb.sibling_friend_start is not null)
        )
      )
      or (
        rb.role_evidence in ('profile_role_pet_parent', 'profile_role_pet_friend')
        and rb.role_chosen_at is not null
      )
    ) as purchase_corroborated
  from resolved_base rb
),
dated as (
  select
    r.*,
    case
      when r.details_start_raw is not null then timezone('utc', r.details_start_raw::timestamptz)
      when r.email_activation_at is not null then timezone('utc', r.email_activation_at)
      when r.dual_role_proven_in_details and r.membership_role = 'pet_parent'::public.membership_role and r.sibling_parent_start is not null then timezone('utc', r.sibling_parent_start)
      when r.dual_role_proven_in_details and r.membership_role = 'pet_friend'::public.membership_role and r.sibling_friend_start is not null then timezone('utc', r.sibling_friend_start)
      when r.role_evidence in ('profile_role_pet_parent', 'profile_role_pet_friend') and r.role_chosen_at is not null then timezone('utc', r.role_chosen_at)
      else null
    end as proposed_start_date,
    case
      when r.details_start_raw is not null then 'details_json'
      when r.email_activation_at is not null then 'email_events.membership_activated'
      when r.dual_role_proven_in_details and r.membership_role = 'pet_parent'::public.membership_role and r.sibling_parent_start is not null then 'sibling_user_memberships.pet_parent'
      when r.dual_role_proven_in_details and r.membership_role = 'pet_friend'::public.membership_role and r.sibling_friend_start is not null then 'sibling_user_memberships.pet_friend'
      when r.role_evidence in ('profile_role_pet_parent', 'profile_role_pet_friend') and r.role_chosen_at is not null then 'profiles.role_chosen_at'
      else null
    end as start_date_source
  from resolved r
),
with_end_dates as (
  select
    d.*,
    case
      when d.details_end_raw is not null then timezone('utc', d.details_end_raw::timestamptz)
      when d.proposed_start_date is not null then
        case d.billing_interval
          when 'one_time' then d.proposed_start_date + interval '1 month'
          when '3_months' then d.proposed_start_date + interval '3 months'
          when '12_months' then d.proposed_start_date + interval '1 year'
        end
      else null
    end as proposed_end_date
  from dated d
),
classified as (
  select
    w.*,
    case
      when w.has_existing_row then 'conflicting existing membership'
      when w.profile_role = 'both'::public.profile_role and not w.dual_role_proven_in_details
        and not w.slug_proves_parent and not w.slug_proves_friend then 'insufficient role evidence (role=both, no dual proof)'
      when not w.purchase_corroborated then 'missing reliable start date (membership_status only)'
      when w.proposed_start_date is null then 'missing reliable start date'
      when w.proposed_end_date is not null and w.proposed_end_date < timezone('utc', now()) then 'would already be expired'
      else 'safe to insert'
    end as preview_classification
  from with_end_dates w
),
insert_rows as (
  select
    c.user_id,
    c.membership_role,
    c.proposed_plan_id,
    c.proposed_plan_name,
    c.proposed_start_date,
    c.proposed_end_date
  from classified c
  where c.preview_classification = 'safe to insert'
    and not c.has_existing_row
    and c.proposed_start_date is not null
    and c.proposed_plan_id is not null
)
insert into public.user_memberships (
  user_id,
  role,
  plan_id,
  status,
  start_date,
  end_date,
  auto_renew
)
select
  ir.user_id,
  ir.membership_role,
  ir.proposed_plan_id,
  'active'::public.membership_status,
  ir.proposed_start_date,
  ir.proposed_end_date,
  false
from insert_rows ir
on conflict (user_id, role) do nothing;
*/

-- -----------------------------------------------------------------------------
-- STEP 3 — Summary counts (optional, after preview)
-- -----------------------------------------------------------------------------
-- select preview_classification, count(*) as row_count
-- from (
--   -- paste STEP 1 classified CTE tail here, or re-run STEP 1 and export results
-- ) s
-- group by preview_classification
-- order by row_count desc;
