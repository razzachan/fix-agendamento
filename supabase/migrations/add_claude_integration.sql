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

-- Atualizar pre_schedules para incluir source (idempotente)
ALTER TABLE IF EXISTS pre_schedules 
  ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
