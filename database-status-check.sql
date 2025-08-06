-- =====================================================
-- SCRIPT DE VERIFICAÇÃO DO STATUS DO BANCO
-- =====================================================
-- Execute ANTES e DEPOIS da limpeza para comparar
-- =====================================================

-- =====================================================
-- 1. USUÁRIOS POR ROLE
-- =====================================================
SELECT 'USUÁRIOS POR ROLE:' as categoria;
SELECT 
    COALESCE(raw_user_meta_data->>'role', 'sem_role') as role,
    count(*) as total
FROM auth.users 
GROUP BY raw_user_meta_data->>'role'
ORDER BY role;

-- =====================================================
-- 2. CONTAGEM GERAL DE TABELAS PRINCIPAIS
-- =====================================================
SELECT 'CONTAGEM GERAL:' as categoria;

SELECT 'auth.users' as tabela, count(*) as total FROM auth.users
UNION ALL
SELECT 'clients' as tabela, count(*) as total FROM clients
UNION ALL
SELECT 'technicians' as tabela, count(*) as total FROM technicians
UNION ALL
SELECT 'service_orders' as tabela, count(*) as total FROM service_orders
UNION ALL
SELECT 'calendar_events' as tabela, count(*) as total FROM calendar_events
UNION ALL
SELECT 'scheduled_services' as tabela, count(*) as total FROM scheduled_services
UNION ALL
SELECT 'agendamentos_ai' as tabela, count(*) as total FROM agendamentos_ai
ORDER BY tabela;

-- =====================================================
-- 3. DETALHES DOS CLIENTES
-- =====================================================
SELECT 'CLIENTES IDENTIFICADOS PARA REMOÇÃO:' as categoria;
SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'client'
   OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
   OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')
ORDER BY created_at;

-- =====================================================
-- 4. USUÁRIOS QUE SERÃO MANTIDOS
-- =====================================================
SELECT 'USUÁRIOS QUE SERÃO MANTIDOS:' as categoria;
SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'role' as role,
    created_at
FROM auth.users 
WHERE raw_user_meta_data->>'role' IN ('admin', 'technician', 'workshop')
   OR (raw_user_meta_data->>'role' IS NULL AND email NOT LIKE '%@teste.com%' AND email NOT LIKE '%teste%')
ORDER BY raw_user_meta_data->>'role', raw_user_meta_data->>'name';

-- =====================================================
-- 5. CONTAGEM DE DADOS RELACIONADOS
-- =====================================================
SELECT 'DADOS RELACIONADOS QUE SERÃO REMOVIDOS:' as categoria;

SELECT 'customer_ratings' as tabela, count(*) as total 
FROM customer_ratings 
WHERE customer_id IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'client'
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')
)

UNION ALL

SELECT 'service_photos' as tabela, count(*) as total 
FROM service_photos 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'client'
           OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
           OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')
    )
)

UNION ALL

SELECT 'technician_checkins' as tabela, count(*) as total 
FROM technician_checkins 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (
        SELECT id FROM auth.users 
        WHERE raw_user_meta_data->>'role' = 'client'
           OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
           OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')
    )
)

UNION ALL

SELECT 'service_orders (clientes)' as tabela, count(*) as total 
FROM service_orders 
WHERE client_id IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'client'
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')
)

UNION ALL

SELECT 'calendar_events (clientes)' as tabela, count(*) as total 
FROM calendar_events 
WHERE client_id IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'client'
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')
)

UNION ALL

SELECT 'scheduled_services (clientes)' as tabela, count(*) as total 
FROM scheduled_services 
WHERE client_id IN (
    SELECT id FROM auth.users 
    WHERE raw_user_meta_data->>'role' = 'client'
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
       OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')
)

ORDER BY tabela;

-- =====================================================
-- 6. RESUMO FINAL
-- =====================================================
SELECT 'RESUMO:' as categoria;
SELECT 
    'Total de clientes a remover' as item,
    count(*) as quantidade
FROM auth.users 
WHERE raw_user_meta_data->>'role' = 'client'
   OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
   OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%')

UNION ALL

SELECT 
    'Total de usuários a manter' as item,
    count(*) as quantidade
FROM auth.users 
WHERE raw_user_meta_data->>'role' IN ('admin', 'technician', 'workshop')
   OR (raw_user_meta_data->>'role' IS NULL AND email NOT LIKE '%@teste.com%' AND email NOT LIKE '%teste%');
