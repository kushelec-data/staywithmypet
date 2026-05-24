-- Do not roll back request insert when notification trigger fails (enum/type drift, etc.).

create or replace function public.notify_care_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
begin
  if new.receiver_id is null or new.sender_id is null then
    return new;
  end if;

  if new.receiver_id = new.sender_id then
    return new;
  end if;

  select coalesce(nullif(trim(p.display_name), ''), 'Someone')
  into v_sender_name
  from public.profiles p
  where p.id = new.sender_id;

  begin
    insert into public.notifications (
      user_id,
      type,
      title,
      body,
      related_request_id,
      read_at
    )
    values (
      new.receiver_id,
      'request_received',
      'New care request',
      v_sender_name || ' sent you a care request',
      new.id,
      null
    );
  exception
    when others then
      raise warning 'notify_care_request_received failed for request %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

notify pgrst, 'reload schema';
