-- Adds optimistic-locking version column for bot session state updates.
-- Safe to run multiple times.

alter table if exists public.bot_sessions
  add column if not exists state_version bigint not null default 0;

-- Optional: helps compare-and-swap updates that filter by id + state_version
create index if not exists bot_sessions_id_state_version_idx
  on public.bot_sessions (id, state_version);
