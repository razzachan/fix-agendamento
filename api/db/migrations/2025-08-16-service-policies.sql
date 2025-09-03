CREATE TABLE IF NOT EXISTS public.bot_service_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text NOT NULL CHECK (service_type in ('domicilio','coleta_diagnostico','coleta_conserto')),
  equipments text[] NOT NULL DEFAULT '{}',
  notes text,
  offer_message text,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(service_type)
);

CREATE INDEX IF NOT EXISTS idx_bot_service_policies_enabled ON public.bot_service_policies(enabled);

