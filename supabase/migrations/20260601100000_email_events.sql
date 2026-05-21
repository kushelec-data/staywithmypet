-- Transactional email deduplication log (sent via Resend from the app)

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete cascade,
  event_type text not null,
  related_request_id uuid null,
  related_booking_id uuid null,
  sent_at timestamptz default now(),
  created_at timestamptz default now(),
  unique_key text unique
);

create index if not exists email_events_user_id_idx on public.email_events (user_id);
create index if not exists email_events_event_type_idx on public.email_events (event_type);

alter table public.email_events enable row level security;
