-- StayWithMyPet — initial schema (Supabase / PostgreSQL)
-- Run in Supabase SQL Editor or via: supabase db push

-- ---------------------------------------------------------------------------
-- Extensions & helpers
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'profile_role') then
    create type public.profile_role as enum ('pet_parent', 'pet_friend', 'both');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'pet_species') then
    create type public.pet_species as enum ('dog', 'cat', 'rabbit', 'bird', 'other');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'request_status') then
    create type public.request_status as enum (
      'pending',
      'accepted',
      'declined',
      'cancelled',
      'completed'
    );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'article_status') then
    create type public.article_status as enum ('draft', 'published', 'archived');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  bio text,
  location text,
  role public.profile_role not null default 'pet_friend',
  phone text,
  is_public boolean not null default true,
  rating_avg numeric(3, 2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  stay_count integer not null default 0 check (stay_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index profiles_role_idx on public.profiles (role);
create index profiles_location_idx on public.profiles (location) where location is not null;
create index profiles_public_idx on public.profiles (is_public) where is_public = true;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Auto-create profile on signup (optional; adjust fields in app if needed)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- pets (owned by Pet Parent)
-- ---------------------------------------------------------------------------

create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  species public.pet_species not null,
  breed text,
  age_label text,
  description text,
  location text,
  price_per_night_cents integer not null default 0 check (price_per_night_cents >= 0),
  is_active boolean not null default true,
  tags text[] not null default '{}',
  rating_avg numeric(3, 2) not null default 0 check (rating_avg >= 0 and rating_avg <= 5),
  rating_count integer not null default 0 check (rating_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index pets_owner_id_idx on public.pets (owner_id);
create index pets_species_idx on public.pets (species);
create index pets_active_idx on public.pets (is_active) where is_active = true;
create index pets_location_idx on public.pets (location) where location is not null;

create trigger pets_set_updated_at
before update on public.pets
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- pet_photos
-- ---------------------------------------------------------------------------

create table public.pet_photos (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete cascade,
  storage_path text not null,
  public_url text,
  alt_text text,
  sort_order smallint not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index pet_photos_pet_id_idx on public.pet_photos (pet_id);
create unique index pet_photos_one_primary_per_pet
  on public.pet_photos (pet_id)
  where is_primary = true;

create trigger pet_photos_set_updated_at
before update on public.pet_photos
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- favorites (pets or Pet Friend profiles)
-- ---------------------------------------------------------------------------

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  pet_id uuid references public.pets (id) on delete cascade,
  friend_profile_id uuid references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint favorites_target_check check (
    (pet_id is not null and friend_profile_id is null)
    or (pet_id is null and friend_profile_id is not null)
  ),
  constraint favorites_not_self check (
    friend_profile_id is null or friend_profile_id <> user_id
  )
);

create unique index favorites_user_pet_unique
  on public.favorites (user_id, pet_id)
  where pet_id is not null;

create unique index favorites_user_friend_unique
  on public.favorites (user_id, friend_profile_id)
  where friend_profile_id is not null;

create index favorites_user_id_idx on public.favorites (user_id);

-- ---------------------------------------------------------------------------
-- requests (Pet Friend ↔ Pet Parent care / companionship)
-- ---------------------------------------------------------------------------

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets (id) on delete restrict,
  pet_parent_id uuid not null references public.profiles (id) on delete cascade,
  pet_friend_id uuid not null references public.profiles (id) on delete cascade,
  status public.request_status not null default 'pending',
  service_type text,
  message text,
  starts_at timestamptz,
  ends_at timestamptz,
  responded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint requests_date_range check (
    starts_at is null or ends_at is null or ends_at >= starts_at
  ),
  constraint requests_distinct_participants check (pet_parent_id <> pet_friend_id)
);

create index requests_pet_id_idx on public.requests (pet_id);
create index requests_pet_parent_id_idx on public.requests (pet_parent_id);
create index requests_pet_friend_id_idx on public.requests (pet_friend_id);
create index requests_status_idx on public.requests (status);

create trigger requests_set_updated_at
before update on public.requests
for each row execute function public.set_updated_at();

-- Denormalize pet_parent_id from pet owner on insert
create or replace function public.set_request_pet_parent()
returns trigger
language plpgsql
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.pets where id = new.pet_id;
  if v_owner is null then
    raise exception 'Pet not found';
  end if;
  new.pet_parent_id := v_owner;
  return new;
end;
$$;

create trigger requests_set_pet_parent
before insert on public.requests
for each row execute function public.set_request_pet_parent();

-- ---------------------------------------------------------------------------
-- reviews (after completed requests)
-- ---------------------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests (id) on delete cascade,
  pet_id uuid not null references public.pets (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reviews_distinct_participants check (reviewer_id <> reviewee_id)
);

create index reviews_pet_id_idx on public.reviews (pet_id);
create index reviews_reviewee_id_idx on public.reviews (reviewee_id);
create index reviews_reviewer_id_idx on public.reviews (reviewer_id);

create trigger reviews_set_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- articles (CMS / blog)
-- ---------------------------------------------------------------------------

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  locale text not null default 'en' check (locale in ('en', 'et')),
  title text not null,
  excerpt text,
  body text,
  category text,
  accent text not null default 'mint' check (accent in ('blue', 'mint', 'lavender', 'orange')),
  read_time_minutes smallint not null default 5 check (read_time_minutes > 0),
  author_id uuid references public.profiles (id) on delete set null,
  status public.article_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint articles_slug_locale_unique unique (slug, locale)
);

create index articles_status_published_idx
  on public.articles (status, published_at desc)
  where status = 'published';

create index articles_category_idx on public.articles (category);

create trigger articles_set_updated_at
before update on public.articles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.pet_photos enable row level security;
alter table public.favorites enable row level security;
alter table public.requests enable row level security;
alter table public.reviews enable row level security;
alter table public.articles enable row level security;

-- profiles
create policy "profiles_select_public"
  on public.profiles for select
  to authenticated, anon
  using (is_public = true or id = (select auth.uid()));

create policy "profiles_insert_own"
  on public.profiles for insert
  to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- pets
create policy "pets_select_active"
  on public.pets for select
  to authenticated, anon
  using (is_active = true or owner_id = (select auth.uid()));

create policy "pets_insert_owner"
  on public.pets for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "pets_update_owner"
  on public.pets for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "pets_delete_owner"
  on public.pets for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- pet_photos (access follows pet ownership / visibility)
create policy "pet_photos_select"
  on public.pet_photos for select
  to authenticated, anon
  using (
    exists (
      select 1 from public.pets p
      where p.id = pet_id
        and (p.is_active = true or p.owner_id = (select auth.uid()))
    )
  );

create policy "pet_photos_insert_owner"
  on public.pet_photos for insert
  to authenticated
  with check (
    exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = (select auth.uid())
    )
  );

create policy "pet_photos_update_owner"
  on public.pet_photos for update
  to authenticated
  using (
    exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = (select auth.uid())
    )
  );

create policy "pet_photos_delete_owner"
  on public.pet_photos for delete
  to authenticated
  using (
    exists (
      select 1 from public.pets p
      where p.id = pet_id and p.owner_id = (select auth.uid())
    )
  );

-- favorites
create policy "favorites_select_own"
  on public.favorites for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "favorites_insert_own"
  on public.favorites for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "favorites_delete_own"
  on public.favorites for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- requests
create policy "requests_select_participant"
  on public.requests for select
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

create policy "requests_insert_friend"
  on public.requests for insert
  to authenticated
  with check (
    pet_friend_id = (select auth.uid())
    and exists (
      select 1 from public.pets p
      where p.id = pet_id and p.is_active = true
    )
  );

create policy "requests_update_participant"
  on public.requests for update
  to authenticated
  using (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  )
  with check (
    pet_parent_id = (select auth.uid())
    or pet_friend_id = (select auth.uid())
  );

-- reviews
create policy "reviews_select_all"
  on public.reviews for select
  to authenticated, anon
  using (true);

create policy "reviews_insert_participant"
  on public.reviews for insert
  to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and r.status = 'completed'
        and (r.pet_parent_id = reviewer_id or r.pet_friend_id = reviewer_id)
        and (
          (r.pet_parent_id = reviewer_id and r.pet_friend_id = reviewee_id)
          or (r.pet_friend_id = reviewer_id and r.pet_parent_id = reviewee_id)
        )
    )
  );

create policy "reviews_update_own"
  on public.reviews for update
  to authenticated
  using (reviewer_id = (select auth.uid()))
  with check (reviewer_id = (select auth.uid()));

-- articles
create policy "articles_select_published"
  on public.articles for select
  to authenticated, anon
  using (
    status = 'published'
    and (published_at is null or published_at <= timezone('utc', now()))
  );

-- Admin authoring: use service_role in backend, or add is_admin on profiles later.
-- Placeholder policy for authors editing own drafts:
create policy "articles_insert_authenticated"
  on public.articles for insert
  to authenticated
  with check (author_id = (select auth.uid()) or author_id is null);

create policy "articles_update_author"
  on public.articles for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "articles_delete_author"
  on public.articles for delete
  to authenticated
  using (author_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Grants (Supabase default roles)
-- ---------------------------------------------------------------------------

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on all tables in schema public to postgres, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

grant usage, select on all sequences in schema public to authenticated, service_role;
