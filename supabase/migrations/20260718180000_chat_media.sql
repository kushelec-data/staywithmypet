-- Chat message photo/video attachments (private storage bucket + message metadata)
-- Storage path: conversations/{conversation_id}/{sender_id}/{uuid}-{sanitized_file_name}

-- ---------------------------------------------------------------------------
-- Message media columns (storage_path = persisted object key; no signed URLs)
-- ---------------------------------------------------------------------------

alter table public.messages
  add column if not exists storage_path text,
  add column if not exists media_type text,
  add column if not exists file_name text,
  add column if not exists file_size bigint,
  add column if not exists mime_type text;

alter table public.messages
  drop constraint if exists messages_body_not_empty;

alter table public.messages
  alter column body drop not null;

alter table public.messages
  alter column body set default '';

alter table public.messages
  drop constraint if exists messages_media_type_check;

alter table public.messages
  add constraint messages_media_type_check
  check (media_type is null or media_type in ('image', 'video'));

alter table public.messages
  drop constraint if exists messages_content_present;

alter table public.messages
  add constraint messages_content_present
  check (
    char_length(trim(coalesce(body, ''))) > 0
    or (
      storage_path is not null
      and char_length(trim(storage_path)) > 0
      and media_type is not null
    )
  );

alter table public.messages
  drop constraint if exists messages_media_fields_consistent;

alter table public.messages
  add constraint messages_media_fields_consistent
  check (
    storage_path is null
    or (
      media_type is not null
      and file_name is not null
      and file_size is not null
      and mime_type is not null
    )
  );

create index if not exists messages_storage_path_idx
  on public.messages (storage_path)
  where storage_path is not null;

-- ---------------------------------------------------------------------------
-- Notification preview for media messages
-- ---------------------------------------------------------------------------

create or replace function public.notify_message_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid;
  v_friend uuid;
  v_recipient uuid;
  v_preview text;
begin
  select c.pet_parent_id, c.pet_friend_id
  into v_parent, v_friend
  from public.conversations c
  where c.id = new.conversation_id;

  if new.sender_id = v_parent then
    v_recipient := v_friend;
  elsif new.sender_id = v_friend then
    v_recipient := v_parent;
  else
    return new;
  end if;

  if v_recipient is null or v_recipient = new.sender_id then
    return new;
  end if;

  if new.media_type = 'image' then
    v_preview := '[Photo]';
  elsif new.media_type = 'video' then
    v_preview := '[Video]';
  else
    v_preview := left(trim(coalesce(new.body, '')), 120);
  end if;

  if v_preview = '' then
    v_preview := 'You have a new message.';
  end if;

  insert into public.notifications (
    user_id,
    type,
    title,
    body,
    related_conversation_id,
    read_at
  )
  values (
    v_recipient,
    'new_message',
    'New message',
    v_preview,
    new.conversation_id,
    null
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Private chat-media storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media',
  'chat-media',
  false,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.chat_media_conversation_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when coalesce((storage.foldername(object_name))[1], '') = 'conversations'
      then nullif((storage.foldername(object_name))[2], '')::uuid
    else nullif((storage.foldername(object_name))[1], '')::uuid
  end;
$$;

create or replace function public.chat_media_sender_id(object_name text)
returns text
language sql
immutable
as $$
  select case
    when coalesce((storage.foldername(object_name))[1], '') = 'conversations'
      then (storage.foldername(object_name))[3]
    else (storage.foldername(object_name))[2]
  end;
$$;

drop policy if exists "chat_media_storage_select" on storage.objects;
drop policy if exists "chat_media_storage_insert" on storage.objects;
drop policy if exists "chat_media_storage_update" on storage.objects;
drop policy if exists "chat_media_storage_delete" on storage.objects;

create policy "chat_media_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.is_conversation_participant(public.chat_media_conversation_id(name))
  );

create policy "chat_media_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat-media'
    and public.chat_media_sender_id(name) = (select auth.uid())::text
    and public.is_conversation_participant(public.chat_media_conversation_id(name))
  );

create policy "chat_media_storage_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.chat_media_sender_id(name) = (select auth.uid())::text
    and public.is_conversation_participant(public.chat_media_conversation_id(name))
  )
  with check (
    bucket_id = 'chat-media'
    and public.chat_media_sender_id(name) = (select auth.uid())::text
    and public.is_conversation_participant(public.chat_media_conversation_id(name))
  );

create policy "chat_media_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'chat-media'
    and public.chat_media_sender_id(name) = (select auth.uid())::text
    and public.is_conversation_participant(public.chat_media_conversation_id(name))
  );
