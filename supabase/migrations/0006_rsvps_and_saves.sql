-- 0006: "Going" or "Interested" on RSVPs, a going count that only counts
-- Going, and saved events.

-- ── RSVP status ─────────────────────────────────────────────────────────
-- Existing RSVPs were all "I'm going", so they start as 'going'.
alter table public.rsvps
  add column status text not null default 'going',
  add constraint rsvps_status_check check (status in ('going', 'interested'));

-- Switching between Going and Interested is an update. People may only
-- change the status of their own RSVPs: not which event or person it's
-- for, which would let the going count drift.
revoke update on public.rsvps from anon, authenticated;
grant update (status) on public.rsvps to authenticated;

create policy "Users can change their own RSVPs"
  on public.rsvps for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── The going count ─────────────────────────────────────────────────────
-- Before: every RSVP counted. Now: only Going counts, and switching
-- between Going and Interested moves the count up or down.
create or replace function public.update_going()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_going boolean := tg_op in ('UPDATE', 'DELETE') and old.status = 'going';
  is_going boolean := tg_op in ('INSERT', 'UPDATE') and new.status = 'going';
  event bigint := case when tg_op = 'DELETE' then old.event_id else new.event_id end;
begin
  if is_going and not was_going then
    update public.events set going = going + 1 where id = event;
  elsif was_going and not is_going then
    update public.events set going = greatest(going - 1, 0) where id = event;
  end if;
  return null;
end;
$$;

drop trigger rsvps_update_going on public.rsvps;

create trigger rsvps_update_going
  after insert or update of status or delete on public.rsvps
  for each row execute function public.update_going();

-- ── Saved events ────────────────────────────────────────────────────────
-- A private bookmark: only you can see what you saved.
create table public.saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id bigint not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

alter table public.saves enable row level security;

create policy "Users can read their own saves"
  on public.saves for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can save events for themselves"
  on public.saves for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can unsave their own saves"
  on public.saves for delete
  to authenticated
  using (auth.uid() = user_id);

-- ── Log ─────────────────────────────────────────────────────────────────
insert into public.schema_migrations (version, name)
values ('0006', 'rsvps_and_saves');
