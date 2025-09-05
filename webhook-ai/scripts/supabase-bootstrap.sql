-- Create events table for analytics
create table if not exists bot_analytics_events (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  type text not null,
  session_id text,
  "from" text,
  channel text,
  data jsonb
);

-- Helpful indexes
create index if not exists idx_bot_analytics_events_ts on bot_analytics_events (ts desc);
create index if not exists idx_bot_analytics_events_type on bot_analytics_events (type);
create index if not exists idx_bot_analytics_events_session on bot_analytics_events (session_id);

