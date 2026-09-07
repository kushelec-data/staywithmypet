-- Analytics admin queries: created_at lookups on activity events.
create index if not exists user_activity_events_created_at_idx
  on public.user_activity_events (created_at desc);
