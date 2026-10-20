-- New-user promotional membership (STAYTEST3M).
-- Applying this file is the activation event: activated_at is timezone('utc', now()).
-- Users whose auth.users.created_at is not strictly later than activated_at are ineligible.
--
-- Do NOT apply:
--   20260718120100_platform_access_codes.sql
--   20260916140000_deactivate_staytest3m.sql
-- Those belong to the retired hardcoded fallback. This feature does not use them.
--
-- Do not modify existing user_memberships except to insert/replace a non-active
-- row for an eligible new user who redeems this promotion.

create table if not exists public.membership_promotions (
  id uuid primary key default gen_random_uuid(),
  code_normalized text not null unique,
  activated_at timestamptz not null,
  expires_at timestamptz not null,
  membership_months integer not null check (membership_months > 0),
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0),
  one_per_user boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at > activated_at)
);

create table if not exists public.membership_promotion_redemptions (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.membership_promotions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  membership_role public.membership_role not null,
  plan_id text not null,
  user_created_at timestamptz not null,
  redeemed_at timestamptz not null default timezone('utc', now()),
  unique (promotion_id, user_id)
);

create index if not exists membership_promotion_redemptions_user_idx
  on public.membership_promotion_redemptions (user_id, redeemed_at desc);

drop trigger if exists membership_promotions_set_updated_at on public.membership_promotions;
create trigger membership_promotions_set_updated_at
before update on public.membership_promotions
for each row execute function public.set_updated_at();

alter table public.membership_promotions enable row level security;
alter table public.membership_promotion_redemptions enable row level security;

revoke all on table public.membership_promotions from public, anon, authenticated;
revoke all on table public.membership_promotion_redemptions from public, anon, authenticated;
grant all on table public.membership_promotions to service_role;
grant all on table public.membership_promotion_redemptions to service_role;

insert into public.membership_promotions (
  code_normalized,
  activated_at,
  expires_at,
  membership_months,
  max_redemptions,
  one_per_user,
  is_active
)
values (
  'STAYTEST3M',
  timezone('utc', now()),
  timestamptz '2026-11-20 23:59:59.999+02',
  2,
  200,
  true,
  true
)
on conflict (code_normalized) do nothing;

create or replace function public.redeem_membership_promotion(
  p_code text,
  p_role public.membership_role
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
  v_code text;
  v_promo public.membership_promotions%rowtype;
  v_user_created_at timestamptz;
  v_now timestamptz := timezone('utc', now());
  v_plan_id text;
  v_plan_name text := '2 Month';
  v_start timestamptz;
  v_end timestamptz;
  v_membership_id uuid;
  v_existing public.user_memberships%rowtype;
  v_has_active boolean;
  v_prior_source boolean;
  v_has_existing boolean;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_SIGNED_IN');
  end if;

  v_code := upper(btrim(coalesce(p_code, '')));
  if v_code = '' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CODE');
  end if;

  if p_role is distinct from 'pet_parent'::public.membership_role
     and p_role is distinct from 'pet_friend'::public.membership_role then
    return jsonb_build_object('ok', false, 'code', 'INVALID_ROLE');
  end if;

  if not exists (select 1 from public.profiles p where p.id = v_user_id) then
    return jsonb_build_object('ok', false, 'code', 'PROFILE_REQUIRED');
  end if;

  select *
  into v_promo
  from public.membership_promotions
  where code_normalized = v_code
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'INVALID_CODE');
  end if;

  if not v_promo.is_active then
    return jsonb_build_object('ok', false, 'code', 'INACTIVE');
  end if;

  if v_now < v_promo.activated_at then
    return jsonb_build_object('ok', false, 'code', 'INACTIVE');
  end if;

  if v_now > v_promo.expires_at then
    return jsonb_build_object('ok', false, 'code', 'EXPIRED');
  end if;

  select u.created_at
  into v_user_created_at
  from auth.users u
  where u.id = v_user_id;

  if v_user_created_at is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_SIGNED_IN');
  end if;

  -- New users only: registration must be strictly after promotion activation.
  if v_user_created_at <= v_promo.activated_at then
    return jsonb_build_object('ok', false, 'code', 'NOT_NEW_USER');
  end if;

  if exists (
    select 1
    from public.membership_promotion_redemptions r
    where r.promotion_id = v_promo.id
      and r.user_id = v_user_id
  ) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_REDEEMED');
  end if;

  select exists (
    select 1
    from public.user_memberships um
    where um.user_id = v_user_id
      and coalesce(um.source, '') in ('platform_access_code', 'test_code', 'membership_promotion')
  )
  into v_prior_source;

  if v_prior_source then
    return jsonb_build_object('ok', false, 'code', 'PREVIOUSLY_REDEEMED');
  end if;

  if p_role = 'pet_parent'::public.membership_role then
    v_plan_id := 'promo-2-month-owner';
  else
    v_plan_id := 'promo-2-month-friend';
  end if;

  select *
  into v_existing
  from public.user_memberships
  where user_id = v_user_id
    and role = p_role
  for update;
  v_has_existing := found;

  if p_role = 'pet_parent'::public.membership_role then
    v_has_active := public.has_active_pet_parent_membership(v_user_id);
  else
    v_has_active := public.has_active_pet_friend_membership(v_user_id);
  end if;

  if v_has_active then
    return jsonb_build_object('ok', false, 'code', 'ACTIVE_MEMBERSHIP');
  end if;

  update public.membership_promotions
  set redemption_count = redemption_count + 1
  where id = v_promo.id
    and (max_redemptions is null or redemption_count < max_redemptions);

  if not found then
    return jsonb_build_object('ok', false, 'code', 'CAP_REACHED');
  end if;

  insert into public.membership_promotion_redemptions (
    promotion_id,
    user_id,
    membership_role,
    plan_id,
    user_created_at
  )
  values (
    v_promo.id,
    v_user_id,
    p_role,
    v_plan_id,
    v_user_created_at
  );

  v_start := v_now;
  v_end := v_now + make_interval(months => v_promo.membership_months);

  if v_has_existing then

    update public.user_memberships
    set
      plan_id = v_plan_id,
      plan_name = v_plan_name,
      status = 'active'::public.membership_status,
      start_date = v_start,
      end_date = v_end,
      auto_renew = false,
      source = 'membership_promotion',
      stripe_subscription_id = null,
      stripe_price_id = null
    where id = v_existing.id
    returning id into v_membership_id;
  else
    insert into public.user_memberships (
      user_id,
      role,
      plan_id,
      plan_name,
      status,
      start_date,
      end_date,
      auto_renew,
      source
    )
    values (
      v_user_id,
      p_role,
      v_plan_id,
      v_plan_name,
      'active'::public.membership_status,
      v_start,
      v_end,
      false,
      'membership_promotion'
    )
    returning id into v_membership_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'membership_id', v_membership_id,
    'role', p_role,
    'plan_id', v_plan_id,
    'start_date', v_start,
    'end_date', v_end,
    'source', 'membership_promotion'
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_REDEEMED');
end;
$$;

comment on function public.redeem_membership_promotion(text, public.membership_role) is
  'Atomically redeem a DB-backed membership promotion for the signed-in user. New registrations only; never grants from a hardcoded code.';

revoke all on function public.redeem_membership_promotion(text, public.membership_role) from public;
grant execute on function public.redeem_membership_promotion(text, public.membership_role) to authenticated;

comment on table public.membership_promotions is
  'Server-validated membership promotions. Granting happens only via redeem_membership_promotion().';
comment on table public.membership_promotion_redemptions is
  'One row per user per promotion. Enforces single redemption with a unique constraint.';
