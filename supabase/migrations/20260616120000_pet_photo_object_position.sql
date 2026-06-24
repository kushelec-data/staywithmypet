-- Focal point metadata for pet photos (object-fit cover positioning).
alter table public.pet_photos
  add column if not exists object_position_x numeric(5, 2) not null default 50,
  add column if not exists object_position_y numeric(5, 2) not null default 50,
  add column if not exists photo_scale numeric(4, 2) not null default 1.00;

comment on column public.pet_photos.object_position_x is
  'Horizontal object-position percentage (0–100, default 50).';
comment on column public.pet_photos.object_position_y is
  'Vertical object-position percentage (0–100, default 50).';
comment on column public.pet_photos.photo_scale is
  'Optional zoom scale applied with object-position (1–3, default 1).';
