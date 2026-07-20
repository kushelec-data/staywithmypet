-- Newsletter email subscriptions (public signup via server action + service role).

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  subscribed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint newsletter_subscribers_email_unique unique (email)
);

create index if not exists newsletter_subscribers_subscribed_at_idx
  on public.newsletter_subscribers (subscribed_at desc);

comment on table public.newsletter_subscribers is 'Marketing newsletter signups from the public contact page.';
comment on column public.newsletter_subscribers.email is 'Lowercase email address; unique across subscribers.';

alter table public.newsletter_subscribers enable row level security;

grant all on public.newsletter_subscribers to service_role;
