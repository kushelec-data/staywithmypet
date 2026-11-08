-- SMTP acceptance metadata for profile-completion reminders.
-- Does not change unique_key, status machine, or retry rules.
-- last_error stays the fallback when these columns are absent.

alter table public.profile_completion_reminder_events
  add column if not exists smtp_message_id text,
  add column if not exists smtp_response text,
  add column if not exists smtp_accepted_count integer,
  add column if not exists smtp_rejected_count integer;
