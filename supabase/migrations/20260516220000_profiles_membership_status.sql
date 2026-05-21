alter table public.profiles
  add column if not exists membership_status text not null default 'Demo';

comment on column public.profiles.membership_status is
  'Membership tier label shown in account UI (Demo, Monthly, Yearly, etc.).';
