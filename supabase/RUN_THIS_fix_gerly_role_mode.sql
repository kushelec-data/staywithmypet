-- One-time data correction: Gerly Kullamaa profile role/mode mismatch
-- Run manually in Supabase SQL Editor (production). NOT a schema migration.
--
-- Context: dashboard mode switch previously promoted role=both without Pet Friend
-- profile data. This reverts presentation to Pet Parent only.
--
-- Guards:
--   - exact profile id
--   - role = both AND active_mode = pet_friend
--   - no pet_care_preferences in profiles.details

begin;

update public.profiles p
set
  role = 'pet_parent'::public.profile_role,
  active_mode = 'pet_parent',
  updated_at = timezone('utc', now())
where p.id = 'b086c03a-6a21-45ea-a1f0-8cfac054f452'
  and p.role = 'both'::public.profile_role
  and p.active_mode = 'pet_friend'
  and coalesce(p.details->'pet_care_preferences', '{}'::jsonb) = '{}'::jsonb;

-- Verify (expect 1 row updated, role pet_parent, active_mode pet_parent):
-- select id, display_name, role, active_mode, details->'pet_care_preferences'
-- from public.profiles
-- where id = 'b086c03a-6a21-45ea-a1f0-8cfac054f452';

commit;
