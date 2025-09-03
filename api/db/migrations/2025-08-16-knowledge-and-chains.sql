-- Knowledge Blocks table (structured training data)
CREATE TABLE IF NOT EXISTS public.bot_knowledge_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  type text DEFAULT 'knowledge_block',
  description text,
  data jsonb,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_bot_knowledge_blocks_key ON public.bot_knowledge_blocks(key);
CREATE INDEX IF NOT EXISTS idx_bot_knowledge_blocks_enabled ON public.bot_knowledge_blocks(enabled);
CREATE INDEX IF NOT EXISTS idx_bot_knowledge_blocks_data_gin ON public.bot_knowledge_blocks USING GIN (data jsonb_path_ops);

-- Neural Chains table (funnel/state orchestration)
CREATE TABLE IF NOT EXISTS public.bot_neural_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  activation jsonb,      -- regras de ativação (intent, termos, estado do funil)
  params_schema jsonb,   -- parâmetros que serão salvos (equipamento, marca, problema, região etc.)
  run_config jsonb,      -- regras de 2º nível, chamadas de API, knowledge scopes
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_neural_chains_enabled ON public.bot_neural_chains(enabled);
CREATE INDEX IF NOT EXISTS idx_bot_neural_chains_activation_gin ON public.bot_neural_chains USING GIN (activation jsonb_path_ops);

-- Ensure bot_sessions.state exists
ALTER TABLE public.bot_sessions
  ADD COLUMN IF NOT EXISTS state jsonb DEFAULT '{}'::jsonb;

