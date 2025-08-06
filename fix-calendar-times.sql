-- 🔧 SCRIPT PARA CORRIGIR HORÁRIOS DO CALENDÁRIO
-- Sincroniza horários de scheduled_services para calendar_events

-- 1. VERIFICAR DADOS ATUAIS
SELECT 
  'CALENDAR_EVENTS' as tabela,
  ce.client_name,
  ce.start_time as horario_calendar,
  ce.status,
  ce.service_order_id
FROM calendar_events ce
WHERE ce.client_name IN ('Denise Deibler', 'Michelle da Silva')
ORDER BY ce.client_name;

SELECT 
  'SCHEDULED_SERVICES' as tabela,
  ss.client_name,
  ss.scheduled_start_time as horario_scheduled,
  ss.status,
  ss.service_order_id
FROM scheduled_services ss
WHERE ss.client_name IN ('Denise Deibler', 'Michelle da Silva')
ORDER BY ss.client_name;

-- 2. ATUALIZAR HORÁRIOS NO CALENDAR_EVENTS BASEADO EM SCHEDULED_SERVICES
UPDATE calendar_events 
SET 
  start_time = ss.scheduled_start_time,
  end_time = ss.scheduled_end_time,
  updated_at = NOW()
FROM scheduled_services ss
WHERE calendar_events.service_order_id = ss.service_order_id
  AND calendar_events.client_name IN ('Denise Deibler', 'Michelle da Silva')
  AND ABS(EXTRACT(EPOCH FROM (calendar_events.start_time - ss.scheduled_start_time))) > 60;

-- 3. VERIFICAR RESULTADO
SELECT 
  'APÓS CORREÇÃO' as status,
  ce.client_name,
  ce.start_time as horario_corrigido,
  ce.status,
  ss.scheduled_start_time as horario_original
FROM calendar_events ce
LEFT JOIN scheduled_services ss ON ce.service_order_id = ss.service_order_id
WHERE ce.client_name IN ('Denise Deibler', 'Michelle da Silva')
ORDER BY ce.client_name;
