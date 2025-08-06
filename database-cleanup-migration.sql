-- ========================================
-- MIGRAÇÃO E LIMPEZA DO BANCO DE DADOS
-- Fix Fogões - Simplificação de Agendamentos
-- ========================================

-- ========================================
-- 1. ANÁLISE ATUAL (EXECUTAR PRIMEIRO)
-- ========================================

-- 1.1 Verificar estado atual das tabelas
SELECT 
    'service_orders' as tabela,
    COUNT(*) as total,
    COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as com_agendamento,
    COUNT(CASE WHEN scheduled_time IS NOT NULL THEN 1 END) as com_horario
FROM service_orders

UNION ALL

SELECT 
    'scheduled_services' as tabela,
    COUNT(*) as total,
    COUNT(CASE WHEN service_order_id IS NOT NULL THEN 1 END) as com_os_vinculada,
    COUNT(CASE WHEN scheduled_start_time IS NOT NULL THEN 1 END) as com_horario
FROM scheduled_services

UNION ALL

SELECT 
    'agendamentos_ai' as tabela,
    COUNT(*) as total,
    COUNT(CASE WHEN ordem_servico_id IS NOT NULL THEN 1 END) as com_os_vinculada,
    COUNT(CASE WHEN data_agendada IS NOT NULL THEN 1 END) as com_data
FROM agendamentos_ai;

-- 1.2 Identificar inconsistências de dados
SELECT 
    'INCONSISTENCIA_DATAS' as tipo,
    so.id,
    so.client_name,
    so.scheduled_date as os_data,
    so.scheduled_time as os_hora,
    ss.scheduled_start_time as ss_inicio,
    ss.scheduled_end_time as ss_fim,
    CASE 
        WHEN so.scheduled_date IS NULL AND ss.scheduled_start_time IS NOT NULL THEN 'OS_SEM_DATA'
        WHEN so.scheduled_date IS NOT NULL AND ss.scheduled_start_time IS NULL THEN 'SS_SEM_DATA'
        WHEN DATE(so.scheduled_date) != DATE(ss.scheduled_start_time) THEN 'DATAS_DIFERENTES'
        ELSE 'OK'
    END as problema
FROM service_orders so
LEFT JOIN scheduled_services ss ON so.id = ss.service_order_id
WHERE so.scheduled_date IS NOT NULL OR ss.scheduled_start_time IS NOT NULL;

-- ========================================
-- 2. MIGRAÇÃO DE DADOS
-- ========================================

-- 2.1 Criar agendamentos para OS que não têm registro em scheduled_services
INSERT INTO scheduled_services (
    id,
    service_order_id,
    technician_id,
    technician_name,
    client_id,
    client_name,
    scheduled_start_time,
    scheduled_end_time,
    address,
    description,
    status,
    created_at
)
SELECT 
    gen_random_uuid() as id,
    so.id as service_order_id,
    so.technician_id,
    so.technician_name,
    so.client_id,
    so.client_name,
    -- 🔧 CORREÇÃO UTC: Combinar scheduled_date + scheduled_time corretamente
    CASE 
        WHEN so.scheduled_time IS NOT NULL THEN
            (DATE(so.scheduled_date) + so.scheduled_time)::timestamp AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC'
        ELSE 
            so.scheduled_date
    END as scheduled_start_time,
    -- Fim: +1 hora do início
    CASE 
        WHEN so.scheduled_time IS NOT NULL THEN
            ((DATE(so.scheduled_date) + so.scheduled_time)::timestamp AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC') + interval '1 hour'
        ELSE 
            so.scheduled_date + interval '1 hour'
    END as scheduled_end_time,
    COALESCE(so.pickup_address, so.delivery_address, 'Endereço não informado') as address,
    CONCAT(
        COALESCE(so.equipment_type, 'Equipamento'), 
        CASE WHEN so.description IS NOT NULL THEN ' - ' || so.description ELSE '' END
    ) as description,
    CASE 
        WHEN so.status = 'completed' THEN 'completed'
        WHEN so.status = 'cancelled' THEN 'cancelled'
        WHEN so.status = 'in_progress' THEN 'in_progress'
        ELSE 'scheduled'
    END as status,
    COALESCE(so.updated_at, so.created_at, NOW()) as created_at
FROM service_orders so
LEFT JOIN scheduled_services ss ON so.id = ss.service_order_id
WHERE so.scheduled_date IS NOT NULL 
  AND ss.id IS NULL  -- Não existe agendamento
  AND so.status NOT IN ('cancelled'); -- Não incluir canceladas

-- 2.2 Atualizar agendamentos existentes com dados mais precisos da OS
UPDATE scheduled_services ss
SET 
    scheduled_start_time = CASE 
        WHEN so.scheduled_time IS NOT NULL THEN
            (DATE(so.scheduled_date) + so.scheduled_time)::timestamp AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC'
        ELSE 
            so.scheduled_date
    END,
    scheduled_end_time = CASE 
        WHEN so.scheduled_time IS NOT NULL THEN
            ((DATE(so.scheduled_date) + so.scheduled_time)::timestamp AT TIME ZONE 'America/Sao_Paulo' AT TIME ZONE 'UTC') + interval '1 hour'
        ELSE 
            so.scheduled_date + interval '1 hour'
    END,
    technician_id = COALESCE(ss.technician_id, so.technician_id),
    technician_name = COALESCE(ss.technician_name, so.technician_name),
    client_id = COALESCE(ss.client_id, so.client_id),
    address = COALESCE(ss.address, so.pickup_address, so.delivery_address)
FROM service_orders so
WHERE ss.service_order_id = so.id
  AND so.scheduled_date IS NOT NULL
  AND (
    -- Atualizar apenas se houver diferenças significativas
    DATE(ss.scheduled_start_time) != DATE(so.scheduled_date) OR
    ss.technician_id IS NULL OR
    ss.client_id IS NULL
  );

-- ========================================
-- 3. LIMPEZA E OTIMIZAÇÃO
-- ========================================

-- 3.1 Remover agendamentos órfãos (sem OS válida)
DELETE FROM scheduled_services ss
WHERE ss.service_order_id IS NULL 
   OR NOT EXISTS (
       SELECT 1 FROM service_orders so 
       WHERE so.id = ss.service_order_id
   );

-- 3.2 Remover duplicatas (manter o mais recente)
WITH duplicates AS (
    SELECT 
        service_order_id,
        id,
        ROW_NUMBER() OVER (
            PARTITION BY service_order_id 
            ORDER BY created_at DESC, scheduled_start_time DESC
        ) as rn
    FROM scheduled_services
    WHERE service_order_id IS NOT NULL
)
DELETE FROM scheduled_services 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- ========================================
-- 4. VERIFICAÇÃO FINAL
-- ========================================

-- 4.1 Verificar se todas as OS agendadas têm registro em scheduled_services
SELECT 
    'VERIFICACAO_FINAL' as tipo,
    COUNT(CASE WHEN ss.id IS NULL THEN 1 END) as os_sem_agendamento,
    COUNT(CASE WHEN ss.id IS NOT NULL THEN 1 END) as os_com_agendamento,
    COUNT(*) as total_os_agendadas
FROM service_orders so
LEFT JOIN scheduled_services ss ON so.id = ss.service_order_id
WHERE so.scheduled_date IS NOT NULL 
  AND so.status NOT IN ('cancelled');

-- 4.2 Verificar consistência de horários
SELECT 
    'CONSISTENCIA_HORARIOS' as tipo,
    COUNT(CASE WHEN DATE(so.scheduled_date) = DATE(ss.scheduled_start_time) THEN 1 END) as datas_consistentes,
    COUNT(CASE WHEN DATE(so.scheduled_date) != DATE(ss.scheduled_start_time) THEN 1 END) as datas_inconsistentes,
    COUNT(*) as total
FROM service_orders so
INNER JOIN scheduled_services ss ON so.id = ss.service_order_id
WHERE so.scheduled_date IS NOT NULL;

-- ========================================
-- 5. PRÓXIMOS PASSOS (MANUAL)
-- ========================================

/*
APÓS EXECUTAR ESTA MIGRAÇÃO:

1. ✅ Atualizar o código para usar APENAS scheduled_services como fonte de agendamentos
2. ✅ Remover campos scheduled_date e scheduled_time de service_orders (opcional)
3. ✅ Implementar função única de conversão UTC
4. ✅ Simplificar consultas do calendário
5. ✅ Atualizar middleware para usar scheduled_services

BENEFÍCIOS:
- ✅ Fonte única da verdade para agendamentos
- ✅ Eliminação de inconsistências de timezone
- ✅ Consultas mais simples e rápidas
- ✅ Manutenção mais fácil
*/
