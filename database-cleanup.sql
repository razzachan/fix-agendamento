-- =====================================================
-- SCRIPT DE LIMPEZA CUIDADOSA DO BANCO DE DADOS
-- Fix Fogões - Remoção de Clientes e Ordens de Serviço
-- =====================================================

-- IMPORTANTE: Execute este script com cuidado!
-- Este script remove TODOS os dados de clientes e ordens de serviço
-- Mantenha um backup antes de executar!

BEGIN;

-- =====================================================
-- ETAPA 1: DESABILITAR TRIGGERS TEMPORARIAMENTE
-- =====================================================
SET session_replication_role = replica;

-- =====================================================
-- ETAPA 2: DELETAR DADOS DEPENDENTES PRIMEIRO
-- =====================================================

-- 2.1 Deletar comentários das ordens de serviço
DELETE FROM service_order_comments WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.2 Deletar progresso das ordens de serviço
DELETE FROM service_order_progress WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.3 Deletar eventos das ordens de serviço
DELETE FROM service_events WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.4 Deletar imagens das ordens de serviço
DELETE FROM service_order_images WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.5 Deletar transações financeiras relacionadas
DELETE FROM financial_transactions WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.6 Deletar notificações relacionadas às ordens
DELETE FROM notifications WHERE related_id IN (
    SELECT id FROM service_orders
);

-- 2.7 Deletar agendamentos AI relacionados
DELETE FROM agendamentos_ai WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.8 Deletar diagnósticos relacionados
DELETE FROM diagnoses WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.9 Deletar ações requeridas
DELETE FROM required_actions WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- 2.10 Deletar avaliações de clientes
DELETE FROM customer_ratings WHERE service_order_id IN (
    SELECT id FROM service_orders
);

-- =====================================================
-- ETAPA 3: DELETAR ORDENS DE SERVIÇO
-- =====================================================

-- 3.1 Contar ordens antes da exclusão
DO $$
DECLARE
    ordem_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO ordem_count FROM service_orders;
    RAISE NOTICE 'Total de ordens de serviço a serem deletadas: %', ordem_count;
END $$;

-- 3.2 Deletar todas as ordens de serviço
DELETE FROM service_orders;

-- =====================================================
-- ETAPA 4: DELETAR DADOS RELACIONADOS AOS CLIENTES
-- =====================================================

-- 4.1 Deletar notificações dos clientes
DELETE FROM notifications WHERE user_id IN (
    SELECT user_id FROM clients WHERE user_id IS NOT NULL
);

-- 4.2 Deletar sessões dos usuários clientes
DELETE FROM auth.sessions WHERE user_id IN (
    SELECT user_id FROM clients WHERE user_id IS NOT NULL
);

-- =====================================================
-- ETAPA 5: DELETAR CLIENTES
-- =====================================================

-- 5.1 Contar clientes antes da exclusão
DO $$
DECLARE
    cliente_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cliente_count FROM clients;
    RAISE NOTICE 'Total de clientes a serem deletados: %', cliente_count;
END $$;

-- 5.2 Armazenar IDs dos usuários para deletar depois
CREATE TEMP TABLE temp_user_ids AS
SELECT DISTINCT user_id 
FROM clients 
WHERE user_id IS NOT NULL;

-- 5.3 Deletar todos os clientes
DELETE FROM clients;

-- =====================================================
-- ETAPA 6: DELETAR USUÁRIOS ÓRFÃOS (APENAS CLIENTES)
-- =====================================================

-- 6.1 Deletar usuários que eram apenas clientes (não técnicos/admins)
DELETE FROM auth.users 
WHERE id IN (
    SELECT user_id FROM temp_user_ids
) 
AND id NOT IN (
    SELECT user_id FROM technicians WHERE user_id IS NOT NULL
    UNION
    SELECT user_id FROM users WHERE role IN ('admin', 'workshop')
);

-- =====================================================
-- ETAPA 7: RESETAR SEQUÊNCIAS
-- =====================================================

-- 7.1 Resetar sequência de numeração das ordens (se existir)
-- ALTER SEQUENCE IF EXISTS service_orders_order_number_seq RESTART WITH 1;

-- =====================================================
-- ETAPA 8: REABILITAR TRIGGERS
-- =====================================================
SET session_replication_role = DEFAULT;

-- =====================================================
-- ETAPA 9: VERIFICAÇÃO FINAL
-- =====================================================

-- 9.1 Contar registros restantes
DO $$
DECLARE
    remaining_orders INTEGER;
    remaining_clients INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orders FROM service_orders;
    SELECT COUNT(*) INTO remaining_clients FROM clients;
    
    RAISE NOTICE '=== LIMPEZA CONCLUÍDA ===';
    RAISE NOTICE 'Ordens de serviço restantes: %', remaining_orders;
    RAISE NOTICE 'Clientes restantes: %', remaining_clients;
    
    IF remaining_orders = 0 AND remaining_clients = 0 THEN
        RAISE NOTICE '✅ Limpeza realizada com sucesso!';
    ELSE
        RAISE WARNING '⚠️  Alguns registros podem não ter sido removidos';
    END IF;
END $$;

-- =====================================================
-- ETAPA 10: LIMPEZA DE STORAGE (IMAGENS)
-- =====================================================

-- NOTA: As imagens no Supabase Storage precisam ser removidas manualmente
-- ou através de uma função específica, pois este script SQL não acessa o Storage.
-- 
-- Para remover imagens do Storage, execute separadamente:
-- SELECT storage.delete_object('service-images', name) FROM storage.objects 
-- WHERE bucket_id = 'service-images';

COMMIT;

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
