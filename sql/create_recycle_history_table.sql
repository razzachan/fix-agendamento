-- Tabela para histórico de reciclagem de ordens
CREATE TABLE IF NOT EXISTS recycle_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  recycle_type VARCHAR(50) NOT NULL CHECK (recycle_type IN ('reschedule', 'reassign', 'reactivate', 'convert_type')),
  previous_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  notes TEXT,
  recycled_by UUID NOT NULL REFERENCES auth.users(id),
  recycled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Campos para rastrear mudanças específicas
  previous_technician_id UUID REFERENCES technicians(id),
  new_technician_id UUID REFERENCES technicians(id),
  previous_service_type VARCHAR(50),
  new_service_type VARCHAR(50),

  -- ID do novo pré-agendamento criado (para reagendamentos)
  new_scheduling_id UUID REFERENCES agendamentos_ai(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar campos na tabela service_orders para rastrear reciclagem
ALTER TABLE service_orders
ADD COLUMN IF NOT EXISTS recycled_to_scheduling_id UUID REFERENCES agendamentos_ai(id);

-- Adicionar campos na tabela agendamentos_ai para rastrear origem da reciclagem
ALTER TABLE agendamentos_ai
ADD COLUMN IF NOT EXISTS ordem_original_id UUID REFERENCES service_orders(id),
ADD COLUMN IF NOT EXISTS reciclado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_recycle_history_order_id ON recycle_history(order_id);
CREATE INDEX IF NOT EXISTS idx_recycle_history_recycled_by ON recycle_history(recycled_by);
CREATE INDEX IF NOT EXISTS idx_recycle_history_recycled_at ON recycle_history(recycled_at);
CREATE INDEX IF NOT EXISTS idx_recycle_history_recycle_type ON recycle_history(recycle_type);

-- RLS (Row Level Security)
ALTER TABLE recycle_history ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura para usuários autenticados
CREATE POLICY "Users can view recycle history" ON recycle_history
  FOR SELECT USING (auth.role() = 'authenticated');

-- Política para permitir inserção para usuários autenticados
CREATE POLICY "Users can create recycle history" ON recycle_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_recycle_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_recycle_history_updated_at
  BEFORE UPDATE ON recycle_history
  FOR EACH ROW
  EXECUTE FUNCTION update_recycle_history_updated_at();

-- Comentários para documentação
COMMENT ON TABLE recycle_history IS 'Histórico de reciclagem de ordens de serviço canceladas';
COMMENT ON COLUMN recycle_history.recycle_type IS 'Tipo de reciclagem: reschedule, reassign, reactivate, convert_type';
COMMENT ON COLUMN recycle_history.reason IS 'Motivo da reciclagem (obrigatório)';
COMMENT ON COLUMN recycle_history.notes IS 'Observações adicionais sobre a reciclagem';
COMMENT ON COLUMN recycle_history.recycled_by IS 'ID do usuário que executou a reciclagem';

-- View para estatísticas de reciclagem
CREATE OR REPLACE VIEW recycle_stats AS
SELECT 
  recycle_type,
  COUNT(*) as total_recycled,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage,
  DATE_TRUNC('month', recycled_at) as month_year
FROM recycle_history 
GROUP BY recycle_type, DATE_TRUNC('month', recycled_at)
ORDER BY month_year DESC, total_recycled DESC;

COMMENT ON VIEW recycle_stats IS 'Estatísticas de reciclagem por tipo e período';
