-- Script para investigar os eventos da Denise Deibler no calendário

-- 1. Buscar todos os eventos da Denise Deibler
SELECT 
    id,
    client_name,
    start_time,
    end_time,
    technician_name,
    service_order_id,
    description,
    status,
    created_at,
    equipment_type,
    address
FROM calendar_events 
WHERE client_name ILIKE '%Denise%Deibler%'
ORDER BY start_time, created_at;

-- 2. Verificar se há duplicatas por service_order_id
SELECT 
    service_order_id,
    COUNT(*) as total_eventos,
    STRING_AGG(id::text, ', ') as event_ids,
    STRING_AGG(start_time::text, ', ') as start_times
FROM calendar_events 
WHERE client_name ILIKE '%Denise%Deibler%'
  AND service_order_id IS NOT NULL
GROUP BY service_order_id
HAVING COUNT(*) > 1;

-- 3. Verificar se há eventos com mesmo horário
SELECT 
    start_time,
    COUNT(*) as total_eventos,
    STRING_AGG(id::text, ', ') as event_ids,
    STRING_AGG(service_order_id::text, ', ') as service_order_ids
FROM calendar_events 
WHERE client_name ILIKE '%Denise%Deibler%'
GROUP BY start_time
HAVING COUNT(*) > 1;

-- 4. Buscar ordens de serviço da Denise Deibler
SELECT 
    id,
    order_number,
    client_name,
    status,
    scheduled_date,
    technician_name,
    equipment_type,
    created_at,
    origem_agendamento_id
FROM service_orders 
WHERE client_name ILIKE '%Denise%Deibler%'
ORDER BY created_at DESC;

-- 5. Verificar se há múltiplas OS para o mesmo agendamento
SELECT 
    origem_agendamento_id,
    COUNT(*) as total_os,
    STRING_AGG(id::text, ', ') as os_ids,
    STRING_AGG(order_number, ', ') as order_numbers
FROM service_orders 
WHERE client_name ILIKE '%Denise%Deibler%'
  AND origem_agendamento_id IS NOT NULL
GROUP BY origem_agendamento_id
HAVING COUNT(*) > 1;

-- 6. Verificar agendamento original da Denise Deibler
SELECT 
    id,
    nome,
    equipamento,
    problema,
    data_agendada,
    status,
    processado,
    ordem_servico_id,
    created_at
FROM agendamentos_ai 
WHERE nome ILIKE '%Denise%Deibler%'
ORDER BY created_at DESC;
