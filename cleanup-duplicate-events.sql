-- Script para limpar eventos duplicados no calendar_events

-- 1. Identificar eventos duplicados por service_order_id
WITH duplicate_events AS (
  SELECT 
    service_order_id,
    COUNT(*) as total_eventos,
    MIN(created_at) as primeiro_evento,
    ARRAY_AGG(id ORDER BY created_at) as event_ids
  FROM calendar_events 
  WHERE service_order_id IS NOT NULL
  GROUP BY service_order_id
  HAVING COUNT(*) > 1
)
SELECT 
  'DUPLICATAS POR SERVICE_ORDER_ID' as tipo,
  service_order_id,
  total_eventos,
  primeiro_evento,
  event_ids
FROM duplicate_events
ORDER BY total_eventos DESC;

-- 2. Identificar eventos duplicados por cliente e horário
WITH duplicate_by_time AS (
  SELECT 
    client_name,
    start_time,
    COUNT(*) as total_eventos,
    ARRAY_AGG(id ORDER BY created_at) as event_ids,
    ARRAY_AGG(service_order_id ORDER BY created_at) as service_order_ids
  FROM calendar_events 
  WHERE client_name IS NOT NULL
  GROUP BY client_name, start_time
  HAVING COUNT(*) > 1
)
SELECT 
  'DUPLICATAS POR CLIENTE E HORARIO' as tipo,
  client_name,
  start_time,
  total_eventos,
  event_ids,
  service_order_ids
FROM duplicate_by_time
ORDER BY total_eventos DESC;

-- 3. LIMPEZA: Remover eventos duplicados mantendo apenas o mais antigo por service_order_id
-- ATENÇÃO: Execute apenas após confirmar que são realmente duplicatas!

-- Primeiro, vamos ver quais eventos seriam removidos (DRY RUN)
WITH events_to_remove AS (
  SELECT 
    id,
    service_order_id,
    client_name,
    start_time,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY service_order_id ORDER BY created_at ASC) as rn
  FROM calendar_events 
  WHERE service_order_id IS NOT NULL
)
SELECT 
  'EVENTOS QUE SERIAM REMOVIDOS' as acao,
  id,
  service_order_id,
  client_name,
  start_time,
  created_at
FROM events_to_remove 
WHERE rn > 1
ORDER BY service_order_id, created_at;

-- 4. COMANDO DE LIMPEZA (descomente para executar)
/*
WITH events_to_remove AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY service_order_id ORDER BY created_at ASC) as rn
  FROM calendar_events 
  WHERE service_order_id IS NOT NULL
)
DELETE FROM calendar_events 
WHERE id IN (
  SELECT id 
  FROM events_to_remove 
  WHERE rn > 1
);
*/

-- 5. Verificar resultado após limpeza
SELECT 
  'VERIFICACAO FINAL' as status,
  COUNT(*) as total_eventos,
  COUNT(DISTINCT service_order_id) as service_orders_unicas,
  COUNT(*) - COUNT(DISTINCT service_order_id) as possivel_duplicatas
FROM calendar_events 
WHERE service_order_id IS NOT NULL;
