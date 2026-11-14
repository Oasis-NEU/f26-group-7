-- 0003: A log of which migration files have been run.
--
-- We apply migrations by pasting them into the Supabase SQL editor, so
-- this table is how anyone can check what the database already has:
--
--   select * from public.schema_migrations order by version;
--
-- Every migration from now on ends by adding its own row (see the bottom
-- of this file).

create table public.schema_migrations (
  version text primary key,
  name text not null,
  applied_at timestamptz not null default now()
);

-- Locked with no policies: the website can't read or write it. Only the
-- dashboard and the engine's secret key can.
alter table public.schema_migrations enable row level security;

-- 0001 and 0002 were applied before this log existed, so their
-- applied_at is the time this file was run, not when they really ran.
insert into public.schema_migrations (version, name) values
  ('0001', 'events'),
  ('0002', 'existing_tables'),
  ('0003', 'migration_log');
