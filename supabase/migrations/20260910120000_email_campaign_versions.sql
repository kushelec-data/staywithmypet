-- Saved-email versioning. Sent rows stay frozen; duplicates increment version_number on the same family.

alter table public.email_campaigns
  add column if not exists family_id uuid;

update public.email_campaigns
  set family_id = id
  where family_id is null;

alter table public.email_campaigns
  alter column family_id set default gen_random_uuid();

alter table public.email_campaigns
  add column if not exists version_number integer not null default 1;

create index if not exists email_campaigns_family_idx
  on public.email_campaigns (family_id, version_number);
