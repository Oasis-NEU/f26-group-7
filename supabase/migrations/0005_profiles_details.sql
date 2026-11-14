-- 0005: More on profiles, private profile details, safer profile editing,
-- and profile photos.
--
-- Before running: the check query in the step notes must return no rows.

-- ── New columns ─────────────────────────────────────────────────────────
alter table public.profiles
  add column username text,
  add column bio text,
  add column school text,
  -- Where you usually start from. Private: it says roughly where you live.
  add column home_stop text,
  -- Who sees which events you're going to (used once friends exist).
  add column privacy text not null default 'friends',
  -- 'admin' can only be set from the dashboard, never from the website.
  add column role text not null default 'user',
  -- When you finished the onboarding steps. Empty means not yet.
  add column onboarded_at timestamptz,
  add column updated_at timestamptz not null default now();

-- ── Rules ───────────────────────────────────────────────────────────────
alter table public.profiles
  -- 3 to 20 lowercase letters, numbers or underscores: "jordan_lee"
  add constraint profiles_username_format_check
    check (username ~ '^[a-z0-9_]{3,20}$'),
  add constraint profiles_username_unique unique (username),
  add constraint profiles_display_name_length_check
    check (char_length(display_name) <= 50),
  add constraint profiles_bio_length_check
    check (char_length(bio) <= 300),
  add constraint profiles_privacy_check
    check (privacy in ('everyone', 'friends', 'only_me')),
  add constraint profiles_role_check
    check (role in ('user', 'admin')),
  -- Must match src/lib/niches.js (without 'All').
  add constraint profiles_favorite_niches_check
    check (favorite_niches <@ array[
      'Thrift', 'Markets', 'Records', 'Live music', 'Museums', 'Galleries',
      'Film', 'Stage', 'Books', 'Third spots', 'Outdoors', 'Games', 'Makers'
    ]::text[]);

-- Reuses the function from 0004.
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── What the website may read ───────────────────────────────────────────
-- Anyone may read the public columns. The private ones (home stop and
-- neighborhood, privacy, role, onboarding) are only readable through
-- my_profile() below, which returns your own row and nobody else's.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, username, display_name, avatar_url, bio, school, favorite_niches,
  created_at
) on public.profiles to anon, authenticated;

create function public.my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.profiles where id = auth.uid();
$$;

revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ── What the website may change ─────────────────────────────────────────
-- Before: users could change any column of their own row, including role.
-- Now: only these columns. Profiles are only created by the sign-up
-- trigger, so the website can't insert them either.
revoke insert, update on public.profiles from anon, authenticated;
grant update (
  username, display_name, avatar_url, bio, school, home_neighborhood,
  home_stop, favorite_niches, privacy, onboarded_at
) on public.profiles to authenticated;

drop policy "Users can create their own profile" on public.profiles;

-- ── Sign-up ─────────────────────────────────────────────────────────────
-- Also keep the name typed on the sign-up form (trimmed to 50 characters).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 50), '')
  );
  return new;
end;
$$;

-- Anyone who signed up before the trigger existed gets a profile now.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- ── Profile photos ──────────────────────────────────────────────────────
-- A public bucket: anyone can view a photo by its link. Each user can only
-- add, replace or delete files in their own folder, named after their id:
-- avatars/<user id>/photo.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', true, 2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

create policy "Users can see their own avatar files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- ── Log ─────────────────────────────────────────────────────────────────
insert into public.schema_migrations (version, name)
values ('0005', 'profiles_details');
