-- =====================================================
-- SCRIPT DE VERIFICAÇÃO PRÉ-LIMPEZA
-- Fix Fogões - Análise dos dados antes da exclusão
-- =====================================================

-- IMPORTANTE: Execute este script ANTES da limpeza para revisar os dados
-- Este script apenas consulta, não modifica nada

-- =====================================================
-- ETAPA 1: CONTAGEM GERAL DE REGISTROS
-- =====================================================

SELECT '=== CONTAGEM GERAL DE REGISTROS ===' as info;

-- 1.1 Contar ordens de serviço
SELECT 
    'service_orders' as tabela,
    COUNT(*) as total_registros,
    MIN(created_at) as primeiro_registro,
    MAX(created_at) as ultimo_registro
FROM service_orders;

-- 1.2 Contar clientes
SELECT 
    'clients' as tabela,
    COUNT(*) as total_registros,
    MIN(created_at) as primeiro_registro,
    MAX(created_at) as ultimo_registro
FROM clients;

-- =====================================================
-- ETAPA 2: ANÁLISE DE DEPENDÊNCIAS
-- =====================================================

SELECT '=== ANÁLISE DE DEPENDÊNCIAS ===' as info;

-- 2.1 Comentários das ordens
SELECT 
    'service_order_comments' as tabela,
    COUNT(*) as total_registros
FROM service_order_comments 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 2.2 Progresso das ordens
SELECT 
    'service_order_progress' as tabela,
    COUNT(*) as total_registros
FROM service_order_progress 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 2.3 Eventos das ordens
SELECT 
    'service_events' as tabela,
    COUNT(*) as total_registros
FROM service_events 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 2.4 Imagens das ordens
SELECT 
    'service_order_images' as tabela,
    COUNT(*) as total_registros
FROM service_order_images 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 2.5 Transações financeiras
SELECT 
    'financial_transactions' as tabela,
    COUNT(*) as total_registros
FROM financial_transactions 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 2.6 Notificações relacionadas
SELECT 
    'notifications (ordens)' as tabela,
    COUNT(*) as total_registros
FROM notifications 
WHERE related_id IN (SELECT id FROM service_orders);

-- 2.7 Agendamentos AI
SELECT 
    'agendamentos_ai' as tabela,
    COUNT(*) as total_registros
FROM agendamentos_ai 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- =====================================================
-- ETAPA 3: ANÁLISE DE CLIENTES
-- =====================================================

SELECT '=== ANÁLISE DE CLIENTES ===' as info;

-- 3.1 Clientes com contas de usuário
SELECT 
    'clientes_com_usuario' as tipo,
    COUNT(*) as total
FROM clients 
WHERE user_id IS NOT NULL;

-- 3.2 Clientes sem contas de usuário
SELECT 
    'clientes_sem_usuario' as tipo,
    COUNT(*) as total
FROM clients 
WHERE user_id IS NULL;

-- 3.3 Usuários que são apenas clientes (não técnicos/admins)
SELECT 
    'usuarios_apenas_clientes' as tipo,
    COUNT(*) as total
FROM auth.users 
WHERE id IN (SELECT user_id FROM clients WHERE user_id IS NOT NULL)
AND id NOT IN (
    SELECT user_id FROM technicians WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM users WHERE role IN ('admin', 'workshop')
);

-- =====================================================
-- ETAPA 4: ANÁLISE DE STORAGE
-- =====================================================

SELECT '=== ANÁLISE DE STORAGE ===' as info;

-- 4.1 Arquivos por bucket
SELECT 
    b.name as bucket_name,
    COUNT(o.id) as total_arquivos,
    ROUND(SUM(o.metadata->>'size')::numeric / 1024 / 1024, 2) as tamanho_mb
FROM storage.buckets b
LEFT JOIN storage.objects o ON b.id = o.bucket_id
WHERE b.name IN ('service-images', 'qr-codes', 'client-documents', 'technician-photos')
GROUP BY b.name
ORDER BY b.name;

-- =====================================================
-- ETAPA 5: ORDENS POR STATUS
-- =====================================================

SELECT '=== ORDENS POR STATUS ===' as info;

SELECT 
    status,
    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM service_orders), 2) as percentual
FROM service_orders
GROUP BY status
ORDER BY quantidade DESC;

-- =====================================================
-- ETAPA 6: ORDENS POR TIPO DE ATENDIMENTO
-- =====================================================

SELECT '=== ORDENS POR TIPO DE ATENDIMENTO ===' as info;

SELECT 
    attendance_type,
    COUNT(*) as quantidade,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM service_orders), 2) as percentual
FROM service_orders
GROUP BY attendance_type
ORDER BY quantidade DESC;

-- =====================================================
-- ETAPA 7: RESUMO FINAL
-- =====================================================

SELECT '=== RESUMO FINAL ===' as info;

DO $$
DECLARE
    total_orders INTEGER;
    total_clients INTEGER;
    total_images INTEGER;
    total_comments INTEGER;
    total_progress INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_orders FROM service_orders;
    SELECT COUNT(*) INTO total_clients FROM clients;
    SELECT COUNT(*) INTO total_images FROM service_order_images;
    SELECT COUNT(*) INTO total_comments FROM service_order_comments;
    SELECT COUNT(*) INTO total_progress FROM service_order_progress;
    
    RAISE NOTICE '=== RESUMO DOS DADOS A SEREM REMOVIDOS ===';
    RAISE NOTICE 'Ordens de serviço: %', total_orders;
    RAISE NOTICE 'Clientes: %', total_clients;
    RAISE NOTICE 'Imagens: %', total_images;
    RAISE NOTICE 'Comentários: %', total_comments;
    RAISE NOTICE 'Registros de progresso: %', total_progress;
    RAISE NOTICE '==========================================';
    
    IF total_orders > 0 OR total_clients > 0 THEN
        RAISE NOTICE '⚠️  ATENÇÃO: Dados serão PERMANENTEMENTE removidos!';
        RAISE NOTICE '📋 Revise cuidadosamente antes de prosseguir com a limpeza.';
    ELSE
        RAISE NOTICE '✅ Nenhum dado encontrado para remoção.';
    END IF;
END $$;

-- =====================================================
-- VERIFICAÇÃO CONCLUÍDA
-- =====================================================
