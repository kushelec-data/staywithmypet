-- Platform access codes (separate from Stripe; server-validated only).

create table if not exists public.platform_access_codes (
  id uuid primary key default gen_random_uuid(),
  code_normalized text not null unique,
  membership_role public.membership_role,
  plan_key text not null,
  max_redemptions integer,
  redemption_count integer not null default 0 check (redemption_count >= 0),
  expires_at timestamptz,
  one_per_user boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_access_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.platform_access_codes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  membership_role public.membership_role not null,
  plan_id text not null,
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);

create index if not exists platform_access_code_redemptions_user_idx
  on public.platform_access_code_redemptions (user_id, redeemed_at desc);

alter table public.platform_access_codes enable row level security;
alter table public.platform_access_code_redemptions enable row level security;

-- Default launch code (3-month test access). Adjust or deactivate in production admin.
insert into public.platform_access_codes (
  code_normalized,
  membership_role,
  plan_key,
  max_redemptions,
  expires_at,
  one_per_user,
  is_active
)
values (
  'STAYTEST3M',
  null,
  '3-month',
  null,
  null,
  true,
  true
)
on conflict (code_normalized) do nothing;

comment on table public.platform_access_codes is
  'Platform-issued membership access codes. Never sent to Stripe.';
