create table if not exists bot_intents (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  examples text[] default '{}',
  tool text,
  tool_schema jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz
);

