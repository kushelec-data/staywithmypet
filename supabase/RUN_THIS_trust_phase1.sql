-- Phase 1 Trust & Safety + structured phone (run in Supabase SQL Editor)
-- Safe to re-run: uses IF NOT EXISTS where supported.

alter table public.profiles
  add column if not exists phone_country_code text,
  add column if not exists phone_number text,
  add column if not exists phone_e164 text,
  add column if not exists phone_verified boolean default false not null,
  add column if not exists emergency_contact_name text,
  add column if not exists emergency_contact_phone_country_code text,
  add column if not exists emergency_contact_phone_number text,
  add column if not exists emergency_contact_phone_e164 text,
  add column if not exists trust_score integer default 0 not null;

comment on column public.profiles.phone_e164 is 'E.164 including leading +';
comment on column public.profiles.emergency_contact_phone_e164 is 'Emergency contact E.164; private, not shown on public profile';
comment on column public.profiles.trust_score is '0-100 computed trust score (denormalized)';
