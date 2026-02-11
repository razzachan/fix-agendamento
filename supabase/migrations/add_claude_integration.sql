-- Integration tables for Claude + WhatsApp leads

-- Optional pre_schedules table for pre-agendamentos
CREATE TABLE IF NOT EXISTS pre_schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  equipment_type VARCHAR(100),
  problem_description TEXT,
  urgency_level VARCHAR(20),
  source VARCHAR(50) DEFAULT 'manual',
  status VARCHAR(50) DEFAULT 'pending_response',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para rastrear interações do Claude
CREATE TABLE IF NOT EXISTS claude_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  raw_message TEXT NOT NULL,
  extracted_equipment VARCHAR(100),
  extracted_problem TEXT,
  urgency_level VARCHAR(20),
  suggested_response TEXT,
  pre_schedule_id UUID REFERENCES pre_schedules(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_claude_phone ON claude_interactions(phone);
CREATE INDEX IF NOT EXISTS idx_claude_created ON claude_interactions(created_at DESC);

-- === CRM fields for pre_schedules (idempotente) ===
-- Observação: Postgres não aceita múltiplas colunas em um único "ADD COLUMN IF NOT EXISTS".
-- Por isso, fazemos um ALTER TABLE com vários "ADD COLUMN IF NOT EXISTS".
ALTER TABLE IF EXISTS pre_schedules
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS crm_status VARCHAR(50) DEFAULT 'novo_lead',
  ADD COLUMN IF NOT EXISTS crm_score INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS crm_last_interaction TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS crm_next_followup TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS crm_notes TEXT[],
  ADD COLUMN IF NOT EXISTS crm_tags VARCHAR(50)[];

-- === CRM view ===
CREATE OR REPLACE VIEW crm_dashboard_metrics AS
SELECT
  COUNT(*) FILTER (WHERE crm_status = 'novo_lead') as novos_leads,
  COUNT(*) FILTER (WHERE crm_status = 'orcamento_enviado') as orcamentos_enviados,
  COUNT(*) FILTER (WHERE crm_status = 'aguardando_resposta') as aguardando_resposta,
  COUNT(*) FILTER (WHERE crm_score >= 80) as leads_quentes,
  COUNT(*) FILTER (WHERE crm_score BETWEEN 60 AND 79) as leads_mornos,
  COUNT(*) FILTER (WHERE crm_score BETWEEN 40 AND 59) as leads_frios
FROM pre_schedules
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- === CRM functions ===
CREATE OR REPLACE FUNCTION calculate_next_followup(score INTEGER)
RETURNS TIMESTAMPTZ AS $$
BEGIN
  IF score >= 80 THEN RETURN NOW() + INTERVAL '2 hours';
  ELSIF score >= 50 THEN RETURN NOW() + INTERVAL '24 hours';
  ELSE RETURN NOW() + INTERVAL '48 hours';
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION recalculate_lead_score(lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
  lead_record RECORD;
  score INTEGER := 50;
  hours_since_last NUMERIC;
BEGIN
  SELECT * INTO lead_record FROM pre_schedules WHERE id = lead_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  hours_since_last := EXTRACT(EPOCH FROM (NOW() - lead_record.crm_last_interaction)) / 3600;

  IF lead_record.client_id IS NOT NULL THEN score := score + 15; END IF;
  IF lead_record.urgency_level = 'high' THEN score := score + 15; END IF;
  IF hours_since_last > 24 AND hours_since_last <= 48 THEN score := score - 20;
  ELSIF hours_since_last > 48 THEN score := score - 30; END IF;

  score := GREATEST(0, LEAST(100, score));
  UPDATE pre_schedules SET crm_score = score WHERE id = lead_id;
  RETURN score;
END;
$$ LANGUAGE plpgsql;

-- === CRM indexes ===
CREATE INDEX IF NOT EXISTS idx_pre_schedules_crm_status ON pre_schedules(crm_status);
CREATE INDEX IF NOT EXISTS idx_pre_schedules_crm_score ON pre_schedules(crm_score DESC);
CREATE INDEX IF NOT EXISTS idx_pre_schedules_crm_next_followup
  ON pre_schedules(crm_next_followup) WHERE crm_next_followup IS NOT NULL;
