-- Supabase Storage bucket for pet listing photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pet-photos',
  'pet-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public read (bucket is public)
create policy "pet_photos_storage_select"
  on storage.objects for select
  to public
  using (bucket_id = 'pet-photos');

-- Owners upload under {user_id}/{pet_id}/...
create policy "pet_photos_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "pet_photos_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "pet_photos_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pet-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
