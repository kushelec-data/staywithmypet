-- Reliable mark-as-read for incoming messages (bypasses silent RLS zero-row updates).

create or replace function public.mark_conversation_messages_read(
  p_conversation_id uuid,
  p_user_id uuid default auth.uid()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_user_id is null or p_user_id is distinct from auth.uid() then
    raise exception 'unauthorized';
  end if;

  if not public.is_conversation_participant(p_conversation_id, p_user_id) then
    return 0;
  end if;

  update public.messages
  set read_at = now()
  where conversation_id = p_conversation_id
    and sender_id <> p_user_id
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_conversation_messages_read(uuid, uuid) from public;
grant execute on function public.mark_conversation_messages_read(uuid, uuid) to authenticated;
