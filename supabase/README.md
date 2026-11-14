# Database

Espial's database is a Supabase (Postgres) project. This folder holds the
database's whole history, so the code and the database always match.

```
supabase/
  migrations/   every change to the database's structure, in order
  seed.sql      sample events for building the site
```

## Migrations

A migration is one SQL file that makes one change to the database's
structure: a new table, a new column, a new security rule. The files are
numbered and run in order, like commits for the database.

| File | What it did |
| --- | --- |
| `0001_events.sql` | The `events` table |
| `0002_existing_tables.sql` | Records `profiles`, `rsvps`, `messages` and the `events` source columns, which were first made in the dashboard |
| `0003_migration_log.sql` | The `schema_migrations` log table |
| `0004_events_details.sql` | Event details (description, image, end time, location, price, adults only, status), rules for valid niches, lines and prices, one row per `(source, source_id)`, search, and "only published events are public" |

### Rules

1. **Never change the database by clicking around the dashboard.** Every
   change goes in a migration file, so the rest of the team can see it.
2. **Never edit a migration that has been run.** To change something, add
   a new file.
3. **Claim the next number in the team chat** before you start, so two
   people don't both write `0004`.

### Adding a migration

1. Create `supabase/migrations/000N_short_name.sql`, using the next number.
2. Turn on row level security for any new table and add its policies in
   the same file.
3. End the file with its row in the log:
   ```sql
   insert into public.schema_migrations (version, name)
   values ('000N', 'short_name');
   ```
4. In Supabase, open **SQL Editor**, then a new tab. Paste the whole file,
   make sure nothing is highlighted (only highlighted text runs), and click
   **Run**.
5. Open a pull request with the file, and say in it that it has been run.

### What has been run?

```sql
select * from public.schema_migrations order by version;
```

If a file is in `migrations/` but not in this list, it hasn't been run yet.

## Sample data

`seed.sql` adds about 30 made-up events over the next 7 days, with dates
counted from today, so they always show on the Home page. Every row has
`source = 'seed'`. Running the file again replaces the old sample rows
with fresh dates and never touches real events.

To run it: open a new SQL Editor tab, paste all of `seed.sql`, and click
**Run**. The warning about a destructive query comes from the `delete`
line, which only removes earlier sample rows.

To remove all sample events:

```sql
delete from public.events where source = 'seed';
```

Deleting an event also deletes any RSVPs on it.

## Keys

The website uses the public anon key from `.env`. It can only do what the
security rules allow. The engine uses the secret key, which never goes in
the website or in git.
