-- 🔍 SCRIPT PARA VERIFICAR E SINCRONIZAR service_orders com scheduled_services
-- Execute este script no SQL Editor do Supabase

-- ========================================
-- 1. ANÁLISE DA SITUAÇÃO ATUAL
-- ========================================

-- 1.1 Verificar estrutura da tabela service_orders
SELECT 
    'service_orders' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'service_orders' 
ORDER BY ordinal_position;

-- 1.2 Verificar estrutura da tabela scheduled_services
SELECT 
    'scheduled_services' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'scheduled_services' 
ORDER BY ordinal_position;

-- ========================================
-- 2. ANÁLISE DE DADOS EXISTENTES
-- ========================================

-- 2.1 Contar registros em cada tabela
SELECT 
    'service_orders' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN scheduled_date IS NOT NULL THEN 1 END) as com_data_agendada,
    COUNT(CASE WHEN technician_id IS NOT NULL THEN 1 END) as com_tecnico
FROM service_orders

UNION ALL

SELECT 
    'scheduled_services' as tabela,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN service_order_id IS NOT NULL THEN 1 END) as com_os_vinculada,
    COUNT(CASE WHEN technician_id IS NOT NULL THEN 1 END) as com_tecnico
FROM scheduled_services;

-- 2.2 Identificar OS com agendamento mas sem registro em scheduled_services
SELECT 
    'OS_SEM_AGENDAMENTO_ESPECIFICO' as tipo,
    so.id,
    so.order_number,
    so.client_name,
    so.scheduled_date,
    so.technician_id,
    so.technician_name,
    so.status,
    so.created_at
FROM service_orders so
LEFT JOIN scheduled_services ss ON ss.service_order_id = so.id
WHERE so.scheduled_date IS NOT NULL 
  AND so.technician_id IS NOT NULL
  AND ss.id IS NULL
  AND so.status NOT IN ('cancelled', 'completed')
ORDER BY so.scheduled_date DESC;

-- 2.3 Identificar agendamentos órfãos (sem OS vinculada)
SELECT 
    'AGENDAMENTO_ORFAO' as tipo,
    ss.id,
    ss.service_order_id,
    ss.client_name,
    ss.scheduled_start_time,
    ss.technician_name,
    ss.status,
    CASE 
        WHEN so.id IS NULL THEN 'OS_NAO_EXISTE'
        WHEN so.status IN ('cancelled', 'completed') THEN 'OS_FINALIZADA'
        ELSE 'OS_ATIVA'
    END as situacao_os
FROM scheduled_services ss
LEFT JOIN service_orders so ON so.id = ss.service_order_id
WHERE ss.service_order_id IS NULL 
   OR so.id IS NULL 
   OR so.status IN ('cancelled', 'completed')
ORDER BY ss.scheduled_start_time DESC;

-- 2.4 Verificar duplicações (mesma OS com múltiplos agendamentos ativos)
SELECT 
    'DUPLICACAO_POTENCIAL' as tipo,
    so.id as os_id,
    so.order_number,
    so.client_name,
    COUNT(ss.id) as qtd_agendamentos,
    STRING_AGG(ss.id::text, ', ') as agendamento_ids,
    STRING_AGG(ss.scheduled_start_time::text, ', ') as datas_agendadas
FROM service_orders so
INNER JOIN scheduled_services ss ON ss.service_order_id = so.id
WHERE ss.status NOT IN ('cancelled', 'completed')
  AND so.status NOT IN ('cancelled', 'completed')
GROUP BY so.id, so.order_number, so.client_name
HAVING COUNT(ss.id) > 1
ORDER BY qtd_agendamentos DESC;

-- ========================================
-- 3. SCRIPT DE SINCRONIZAÇÃO
-- ========================================

-- 3.1 Criar agendamentos para OS que não têm (DRY RUN - apenas SELECT)
SELECT 
    'SERIA_CRIADO' as acao,
    so.id as service_order_id,
    so.order_number,
    so.client_name,
    so.technician_id,
    so.technician_name,
    so.scheduled_date,
    -- Calcular horário de início e fim
    COALESCE(
        so.scheduled_date,
        so.created_at::timestamp + interval '1 day'
    ) as scheduled_start_time,
    COALESCE(
        so.scheduled_date,
        so.created_at::timestamp + interval '1 day'
    ) + interval '1 hour' as scheduled_end_time,
    COALESCE(so.pickup_address, 'Endereço não informado') as address,
    CONCAT(so.equipment_type, ' - ', so.description) as description
FROM service_orders so
LEFT JOIN scheduled_services ss ON ss.service_order_id = so.id
WHERE so.scheduled_date IS NOT NULL 
  AND so.technician_id IS NOT NULL
  AND so.technician_name IS NOT NULL
  AND ss.id IS NULL
  AND so.status NOT IN ('cancelled', 'completed')
ORDER BY so.scheduled_date DESC;

-- ========================================
-- 4. COMANDOS DE CORREÇÃO (EXECUTAR APENAS APÓS ANÁLISE)
-- ========================================

-- 4.1 CRIAR agendamentos para OS órfãs (DESCOMENTE PARA EXECUTAR)
/*
INSERT INTO scheduled_services (
    service_order_id,
    technician_id,
    technician_name,
    client_id,
    client_name,
    scheduled_start_time,
    scheduled_end_time,
    address,
    description,
    status
)
SELECT 
    so.id,
    so.technician_id,
    so.technician_name,
    so.client_id,
    so.client_name,
    COALESCE(
        so.scheduled_date,
        so.created_at::timestamp + interval '1 day'
    ),
    COALESCE(
        so.scheduled_date,
        so.created_at::timestamp + interval '1 day'
    ) + interval '1 hour',
    COALESCE(so.pickup_address, 'Endereço não informado'),
    CONCAT(so.equipment_type, ' - ', so.description),
    'scheduled'
FROM service_orders so
LEFT JOIN scheduled_services ss ON ss.service_order_id = so.id
WHERE so.scheduled_date IS NOT NULL 
  AND so.technician_id IS NOT NULL
  AND so.technician_name IS NOT NULL
  AND ss.id IS NULL
  AND so.status NOT IN ('cancelled', 'completed');
*/

-- 4.2 REMOVER agendamentos órfãos (DESCOMENTE PARA EXECUTAR)
/*
DELETE FROM scheduled_services 
WHERE service_order_id IS NULL 
   OR service_order_id NOT IN (SELECT id FROM service_orders);
*/

-- 4.3 CANCELAR agendamentos de OS finalizadas (DESCOMENTE PARA EXECUTAR)
/*
UPDATE scheduled_services 
SET status = 'cancelled'
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE status IN ('cancelled', 'completed')
)
AND status NOT IN ('cancelled', 'completed');
*/

-- ========================================
-- 5. VERIFICAÇÃO FINAL
-- ========================================

-- 5.1 Resumo final após correções
SELECT 
    'RESUMO_FINAL' as tipo,
    (SELECT COUNT(*) FROM service_orders WHERE scheduled_date IS NOT NULL AND technician_id IS NOT NULL) as os_agendadas,
    (SELECT COUNT(*) FROM scheduled_services WHERE service_order_id IS NOT NULL) as agendamentos_vinculados,
    (SELECT COUNT(*) FROM service_orders so LEFT JOIN scheduled_services ss ON ss.service_order_id = so.id 
     WHERE so.scheduled_date IS NOT NULL AND so.technician_id IS NOT NULL AND ss.id IS NULL) as os_sem_agendamento,
    (SELECT COUNT(*) FROM scheduled_services WHERE service_order_id IS NULL) as agendamentos_orfaos;

-- 5.2 Verificar consistência de dados
SELECT 
    'VERIFICACAO_CONSISTENCIA' as tipo,
    COUNT(CASE WHEN so.client_name != ss.client_name THEN 1 END) as nomes_diferentes,
    COUNT(CASE WHEN so.technician_id != ss.technician_id THEN 1 END) as tecnicos_diferentes,
    COUNT(CASE WHEN DATE(so.scheduled_date) != DATE(ss.scheduled_start_time) THEN 1 END) as datas_diferentes
FROM service_orders so
INNER JOIN scheduled_services ss ON ss.service_order_id = so.id
WHERE so.scheduled_date IS NOT NULL;
