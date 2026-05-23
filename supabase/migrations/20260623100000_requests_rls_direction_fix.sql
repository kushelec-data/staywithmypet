-- Fix request respond/cancel RLS to use sender_id / receiver_id (not role columns).

drop policy if exists "requests_update_receiver_respond" on public.requests;
drop policy if exists "requests_update_sender_cancel" on public.requests;

create policy "requests_update_receiver_respond"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and receiver_id = (select auth.uid())
  )
  with check (
    receiver_id = (select auth.uid())
    and status in ('accepted', 'declined')
  );

create policy "requests_update_sender_cancel"
  on public.requests for update
  to authenticated
  using (
    status = 'pending'
    and sender_id = (select auth.uid())
  )
  with check (
    sender_id = (select auth.uid())
    and status = 'cancelled'
  );

notify pgrst, 'reload schema';
