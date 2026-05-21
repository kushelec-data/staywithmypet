-- Allow reading display names for users you share a care request with.
-- Run in Supabase SQL Editor if request From/To shows "Member".

drop policy if exists "profiles_select_request_participant" on public.profiles;

create policy "profiles_select_request_participant"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.requests r
      where (
        r.sender_id = profiles.id
        or r.receiver_id = profiles.id
        or r.pet_parent_id = profiles.id
        or r.pet_friend_id = profiles.id
      )
      and (
        r.sender_id = (select auth.uid())
        or r.receiver_id = (select auth.uid())
        or r.pet_parent_id = (select auth.uid())
        or r.pet_friend_id = (select auth.uid())
      )
    )
  );

notify pgrst, 'reload schema';
