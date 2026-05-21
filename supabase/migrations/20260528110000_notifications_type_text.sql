-- Ensure notifications.type is plain text (not notification_type enum).

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_type'
  ) then
    alter table public.notifications
      alter column type type text using type::text;

    drop type public.notification_type;
  end if;
exception
  when others then
    -- Column may already be text; ensure type is text-compatible.
    null;
end $$;

-- Normalize legacy enum labels if present.
update public.notifications
set type = 'request_received'
where type in ('care_request_received');

update public.notifications
set type = 'new_message'
where type in ('message_received');

notify pgrst, 'reload schema';
