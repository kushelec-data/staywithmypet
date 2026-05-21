-- Request direction is sender_id / receiver_id only (no initiated_by_id).

create or replace function public.set_request_direction_from_roles()
returns trigger
language plpgsql
as $$
begin
  if new.sender_id is null or new.receiver_id is null then
    raise exception 'sender_id and receiver_id are required';
  end if;
  return new;
end;
$$;
