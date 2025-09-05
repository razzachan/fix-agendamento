-- price list
create table if not exists price_list (
  id uuid primary key default gen_random_uuid(),
  service_type text not null,
  region text,
  urgency text,
  base numeric,
  min numeric,
  max numeric,
  priority int default 1,
  notes text
);

-- working hours (0=Domingo ... 6=Sábado)
create table if not exists working_hours (
  id serial primary key,
  weekday int not null,
  start_time text not null,
  end_time text not null
);

-- blackouts (feriados/manutenção)
create table if not exists blackouts (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text
);

-- calendar events (fonte única de agenda)
create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  service_order_id text,
  client_id text,
  client_name text,
  technician_id text,
  technician_name text,
  region text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  address text,
  description text,
  status text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz
);

-- technicians
create table if not exists technicians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean default true,
  regions text[] default '{}',
  skills text[] default '{}',
  weight int default 1
);

-- assignment pointer
create table if not exists tech_assign_pointer (
  id int primary key,
  index int default 0
);

-- bot audit/messages (simplificado)
create table if not exists bot_sessions (
  id uuid primary key default gen_random_uuid(),
  channel text,
  peer_id text,
  state jsonb,
  updated_at timestamptz default now()
);

create table if not exists bot_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references bot_sessions(id),
  direction text,
  body text,
  meta jsonb,
  created_at timestamptz default now()
);

