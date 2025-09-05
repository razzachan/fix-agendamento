-- Habilita extensão p/ UUID (normalmente já existe)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de logs de decisão do bot
CREATE TABLE IF NOT EXISTS public.decision_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  entity_id text NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_decision_logs_created_at ON public.decision_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_logs_entity ON public.decision_logs(entity);
CREATE INDEX IF NOT EXISTS idx_decision_logs_action ON public.decision_logs(action);