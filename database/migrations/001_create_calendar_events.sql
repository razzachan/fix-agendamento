-- =====================================================
-- MIGRAÇÃO: FONTE ÚNICA DA VERDADE PARA CALENDÁRIO
-- =====================================================
-- Cria tabela calendar_events como fonte única para todos os eventos
-- Elimina necessidade de sincronização entre múltiplas tabelas

-- 1. CRIAR TABELA PRINCIPAL
CREATE TABLE calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Dados básicos do cliente
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_id UUID,
  
  -- Dados do técnico
  technician_id UUID,
  technician_name TEXT NOT NULL,
  
  -- HORÁRIOS (FONTE ÚNICA DA VERDADE)
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Detalhes do serviço
  address TEXT NOT NULL,
  address_complement TEXT,
  description TEXT,
  equipment_type TEXT,
  
  -- STATUS (ÚNICO E DEFINITIVO)
  status TEXT NOT NULL DEFAULT 'scheduled',
  -- Valores possíveis: scheduled, on_the_way, in_progress, at_workshop, 
  -- diagnosis, awaiting_approval, in_repair, ready_delivery, completed, cancelled
  
  -- Referências para compatibilidade (opcionais)
  service_order_id UUID,
  original_ai_id UUID,
  
  -- Metadados
  is_urgent BOOLEAN DEFAULT false,
  logistics_group TEXT,
  final_cost DECIMAL,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX idx_calendar_events_technician_id ON calendar_events(technician_id);
CREATE INDEX idx_calendar_events_status ON calendar_events(status);
CREATE INDEX idx_calendar_events_service_order_id ON calendar_events(service_order_id);
CREATE INDEX idx_calendar_events_date_range ON calendar_events(start_time, end_time);

-- 3. CRIAR TRIGGER PARA UPDATED_AT
CREATE OR REPLACE FUNCTION update_calendar_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calendar_events_updated_at
  BEFORE UPDATE ON calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION update_calendar_events_updated_at();

-- 4. MIGRAR DADOS EXISTENTES
INSERT INTO calendar_events (
  client_name,
  client_phone,
  client_id,
  technician_id,
  technician_name,
  start_time,
  end_time,
  address,
  address_complement,
  description,
  equipment_type,
  status,
  service_order_id,
  logistics_group,
  final_cost,
  created_at
)
SELECT 
  s.client_name,
  so.client_phone,
  s.client_id,
  s.technician_id,
  s.technician_name,
  s.scheduled_start_time,
  s.scheduled_end_time,
  s.address,
  s.address_complement,
  s.description,
  so.equipment_type,
  -- Mapear status usando a lógica correta
  CASE 
    WHEN so.status IS NOT NULL THEN
      CASE so.status
        WHEN 'pending' THEN 'scheduled'
        WHEN 'scheduled' THEN 'scheduled'
        WHEN 'scheduled_collection' THEN 'scheduled'
        WHEN 'on_the_way' THEN 'on_the_way'
        WHEN 'in_progress' THEN 'in_progress'
        WHEN 'collected' THEN 'on_the_way'
        WHEN 'collected_for_diagnosis' THEN 'on_the_way'
        WHEN 'at_workshop' THEN 'at_workshop'
        WHEN 'received_at_workshop' THEN 'at_workshop'
        WHEN 'diagnosis_completed' THEN 'awaiting_approval'
        WHEN 'quote_sent' THEN 'awaiting_approval'
        WHEN 'quote_approved' THEN 'in_repair'
        WHEN 'needs_workshop' THEN 'in_repair'
        WHEN 'in_repair' THEN 'in_repair'
        WHEN 'ready_for_delivery' THEN 'ready_delivery'
        WHEN 'collected_for_delivery' THEN 'ready_delivery'
        WHEN 'on_the_way_to_deliver' THEN 'ready_delivery'
        WHEN 'payment_pending' THEN 'ready_delivery'
        WHEN 'completed' THEN 'completed'
        WHEN 'delivered' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        WHEN 'quote_rejected' THEN 'cancelled'
        WHEN 'returned' THEN 'cancelled'
        ELSE 'scheduled'
      END
    ELSE
      CASE s.status
        WHEN 'scheduled' THEN 'scheduled'
        WHEN 'in_progress' THEN 'on_the_way'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'scheduled'
      END
  END,
  s.service_order_id,
  s.logistics_group,
  so.final_cost,
  COALESCE(s.created_at, NOW())
FROM scheduled_services s
LEFT JOIN service_orders so ON s.service_order_id = so.id
WHERE s.service_order_id IS NOT NULL;

-- 5. ADICIONAR EVENTOS DE agendamentos_ai QUE NÃO TÊM ORDEM DE SERVIÇO
INSERT INTO calendar_events (
  client_name,
  client_phone,
  technician_id,
  technician_name,
  start_time,
  end_time,
  address,
  description,
  equipment_type,
  status,
  original_ai_id,
  is_urgent,
  logistics_group,
  created_at
)
SELECT 
  a.nome,
  a.telefone,
  a.technician_id,
  COALESCE(a.tecnico, 'Não atribuído'),
  COALESCE(a.horario_confirmado, a.data_agendada, NOW() + INTERVAL '1 day'),
  COALESCE(a.horario_confirmado, a.data_agendada, NOW() + INTERVAL '1 day') + INTERVAL '1 hour',
  a.endereco,
  a.problema,
  a.equipamento,
  CASE a.status
    WHEN 'agendado' THEN 'scheduled'
    WHEN 'pendente' THEN 'scheduled'
    ELSE 'scheduled'
  END,
  a.id,
  COALESCE(a.urgente, false),
  a.logistics_group,
  a.created_at
FROM agendamentos_ai a
WHERE a.ordem_servico_id IS NULL
  AND a.status IN ('agendado', 'pendente');

-- 6. COMENTÁRIOS E DOCUMENTAÇÃO
COMMENT ON TABLE calendar_events IS 'Fonte única da verdade para todos os eventos do calendário. Elimina necessidade de sincronização entre múltiplas tabelas.';
COMMENT ON COLUMN calendar_events.start_time IS 'Horário de início - FONTE ÚNICA DA VERDADE';
COMMENT ON COLUMN calendar_events.end_time IS 'Horário de fim - FONTE ÚNICA DA VERDADE';
COMMENT ON COLUMN calendar_events.status IS 'Status único e definitivo do evento';
COMMENT ON COLUMN calendar_events.service_order_id IS 'Referência opcional para service_orders (compatibilidade)';
COMMENT ON COLUMN calendar_events.original_ai_id IS 'Referência opcional para agendamentos_ai (compatibilidade)';

-- 7. VERIFICAR MIGRAÇÃO
SELECT 
  'calendar_events' as tabela,
  COUNT(*) as total_eventos,
  COUNT(DISTINCT status) as status_diferentes,
  MIN(start_time) as primeiro_evento,
  MAX(start_time) as ultimo_evento
FROM calendar_events;

-- Mostrar distribuição por status
SELECT status, COUNT(*) as quantidade
FROM calendar_events 
GROUP BY status 
ORDER BY quantidade DESC;
