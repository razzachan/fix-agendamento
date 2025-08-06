-- Melhorias na tabela calendar_events para melhor relacionamento entre eventos

-- 1. Adicionar tipo de evento
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'service';

-- 2. Adicionar relacionamento entre eventos (pai/filho)
ALTER TABLE calendar_events 
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES calendar_events(id);

-- 3. Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_calendar_events_event_type ON calendar_events(event_type);
CREATE INDEX IF NOT EXISTS idx_calendar_events_parent_event_id ON calendar_events(parent_event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_service_order_event_type ON calendar_events(service_order_id, event_type);

-- 4. Atualizar eventos existentes com tipos apropriados
UPDATE calendar_events 
SET event_type = CASE 
  WHEN description ILIKE '%entrega%' THEN 'delivery'
  WHEN description ILIKE '%coleta%' THEN 'collection'
  WHEN description ILIKE '%diagnóstico%' OR description ILIKE '%diagnostico%' THEN 'diagnosis'
  ELSE 'service'
END
WHERE event_type = 'service';

-- 5. Criar relacionamento entre eventos de coleta e entrega da mesma OS
WITH delivery_events AS (
  SELECT id, service_order_id 
  FROM calendar_events 
  WHERE event_type = 'delivery'
),
service_events AS (
  SELECT id, service_order_id 
  FROM calendar_events 
  WHERE event_type = 'service' 
    AND service_order_id IN (SELECT service_order_id FROM delivery_events)
)
UPDATE calendar_events 
SET parent_event_id = service_events.id
FROM delivery_events, service_events
WHERE calendar_events.id = delivery_events.id 
  AND delivery_events.service_order_id = service_events.service_order_id;

-- 6. Verificar resultado
SELECT 
  'EVENTOS POR TIPO' as info,
  event_type,
  COUNT(*) as quantidade
FROM calendar_events 
GROUP BY event_type
ORDER BY quantidade DESC;

-- 7. Verificar relacionamentos criados
SELECT 
  'RELACIONAMENTOS' as info,
  COUNT(*) as eventos_com_pai,
  COUNT(DISTINCT parent_event_id) as eventos_pai_unicos
FROM calendar_events 
WHERE parent_event_id IS NOT NULL;
