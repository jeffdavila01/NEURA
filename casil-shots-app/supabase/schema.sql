-- Run this in the Supabase SQL editor before enabling the owner dashboard.
create table if not exists public.casil_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.casil_media (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  kind text not null check (kind in ('photo', 'video')),
  object_path text not null unique,
  content_type text not null,
  size bigint not null default 0 check (size >= 0),
  created_at timestamptz not null default now()
);

alter table public.casil_media add column if not exists size bigint not null default 0 check (size >= 0);

alter table public.casil_owner enable row level security;
alter table public.casil_media enable row level security;

drop policy if exists "Owner can read own owner record" on public.casil_owner;
create policy "Owner can read own owner record" on public.casil_owner
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Owner can manage own media" on public.casil_media;
create policy "Owner can manage own media" on public.casil_media
  for all to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (select 1 from public.casil_owner o where o.user_id = (select auth.uid()))
  )
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.casil_owner o where o.user_id = (select auth.uid()))
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'casil-private-media', 'casil-private-media', false, 52428800,
  array['image/jpeg','image/png','image/webp','image/avif','image/gif','video/mp4','video/webm','video/quicktime']
)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "Owner can read private media objects" on storage.objects;
create policy "Owner can read private media objects" on storage.objects
  for select to authenticated using (
    bucket_id = 'casil-private-media'
    and exists (select 1 from public.casil_owner o where o.user_id = (select auth.uid()))
  );

drop policy if exists "Owner can upload private media objects" on storage.objects;
create policy "Owner can upload private media objects" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'casil-private-media'
    and exists (select 1 from public.casil_owner o where o.user_id = (select auth.uid()))
  );

drop policy if exists "Owner can delete private media objects" on storage.objects;
create policy "Owner can delete private media objects" on storage.objects
  for delete to authenticated using (
    bucket_id = 'casil-private-media'
    and exists (select 1 from public.casil_owner o where o.user_id = (select auth.uid()))
  );

-- The owner-signup Edge Function claims this singleton row using its service role.
-- Never put the service role key in the website or its VITE_* environment variables.
revoke all on public.casil_owner from anon, authenticated;
grant select on public.casil_owner to authenticated;
grant select, insert, update, delete on public.casil_media to authenticated;
