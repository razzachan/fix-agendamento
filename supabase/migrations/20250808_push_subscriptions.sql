-- push subscriptions table
create table if not exists public.push_subscriptions (
  user_id uuid not null,
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- index por usuário
create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

-- RLS (permitir que cada usuário veja e gerencie a sua própria assinatura)
alter table public.push_subscriptions enable row level security;

-- recriar a policy de forma idempotente (Postgres 15 não suporta IF NOT EXISTS em policy)
drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;
create policy "Users can manage own push subscriptions"
  on public.push_subscriptions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

