-- =====================================================
-- SCRIPT SQL DIRETO PARA LIMPEZA FORÇADA
-- Fix Fogões - Execução direta no SQL Editor do Supabase
-- =====================================================

-- IMPORTANTE: Execute este script diretamente no SQL Editor do Supabase
-- Acesse: https://supabase.com/dashboard/project/hdyucwabemspehokoiks/sql

BEGIN;

-- =====================================================
-- ETAPA 1: DESABILITAR CONSTRAINTS TEMPORARIAMENTE
-- =====================================================

-- Desabilitar verificação de foreign keys temporariamente
SET session_replication_role = replica;

-- =====================================================
-- ETAPA 2: DELETAR DADOS DEPENDENTES PRIMEIRO
-- =====================================================

-- 2.1 Deletar comentários das ordens de serviço
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM service_order_comments;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Comentários deletados: %', deleted_count;
END $$;

-- 2.2 Deletar progresso das ordens de serviço
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM service_order_progress;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Registros de progresso deletados: %', deleted_count;
END $$;

-- 2.3 Deletar imagens das ordens de serviço
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM service_order_images;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Imagens deletadas: %', deleted_count;
END $$;

-- 2.4 Deletar transações financeiras
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM financial_transactions;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Transações financeiras deletadas: %', deleted_count;
END $$;

-- 2.5 Deletar agendamentos AI
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agendamentos_ai;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Agendamentos AI deletados: %', deleted_count;
END $$;

-- 2.6 Deletar diagnósticos (se existir)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnoses') THEN
        DELETE FROM diagnoses;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Diagnósticos deletados: %', deleted_count;
    ELSE
        RAISE NOTICE 'Tabela diagnoses não existe';
    END IF;
END $$;

-- 2.7 Deletar ações requeridas (se existir)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'required_actions') THEN
        DELETE FROM required_actions;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Ações requeridas deletadas: %', deleted_count;
    ELSE
        RAISE NOTICE 'Tabela required_actions não existe';
    END IF;
END $$;

-- 2.8 Deletar avaliações de clientes (se existir)
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_ratings') THEN
        DELETE FROM customer_ratings;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        RAISE NOTICE 'Avaliações deletadas: %', deleted_count;
    ELSE
        RAISE NOTICE 'Tabela customer_ratings não existe';
    END IF;
END $$;

-- 2.9 Deletar notificações relacionadas
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications WHERE related_id IN (SELECT id FROM service_orders);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Notificações deletadas: %', deleted_count;
END $$;

-- =====================================================
-- ETAPA 3: FORÇAR EXCLUSÃO DE SERVICE_EVENTS
-- =====================================================

-- 3.1 Deletar TODOS os eventos (FORÇADO)
DO $$
DECLARE
    deleted_count INTEGER;
    remaining_count INTEGER;
BEGIN
    -- Primeira tentativa
    DELETE FROM service_events;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Service events deletados (1ª tentativa): %', deleted_count;
    
    -- Verificar se ainda restam
    SELECT COUNT(*) INTO remaining_count FROM service_events;
    
    IF remaining_count > 0 THEN
        RAISE NOTICE 'Ainda restam % eventos, forçando exclusão...', remaining_count;
        
        -- Tentar deletar um por um
        FOR event_record IN (SELECT id FROM service_events) LOOP
            DELETE FROM service_events WHERE id = event_record.id;
        END LOOP;
        
        -- Verificação final
        SELECT COUNT(*) INTO remaining_count FROM service_events;
        RAISE NOTICE 'Service events restantes após força: %', remaining_count;
    ELSE
        RAISE NOTICE '✅ Todos os service events foram deletados!';
    END IF;
END $$;

-- =====================================================
-- ETAPA 4: DELETAR ORDENS DE SERVIÇO (AGORA SEM CONSTRAINTS)
-- =====================================================

-- 4.1 Verificação final antes de deletar ordens
DO $$
DECLARE
    events_count INTEGER;
    orders_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO events_count FROM service_events;
    SELECT COUNT(*) INTO orders_count FROM service_orders;
    
    RAISE NOTICE '=== VERIFICAÇÃO FINAL ===';
    RAISE NOTICE 'Service events restantes: %', events_count;
    RAISE NOTICE 'Service orders para deletar: %', orders_count;
    
    IF events_count > 0 THEN
        RAISE WARNING '⚠️ AINDA EXISTEM % EVENTOS! Não é seguro prosseguir.', events_count;
    ELSE
        RAISE NOTICE '✅ Seguro para deletar ordens de serviço';
    END IF;
END $$;

-- 4.2 Deletar todas as ordens de serviço
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM service_orders;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Ordens de serviço deletadas: %', deleted_count;
END $$;

-- =====================================================
-- ETAPA 5: DELETAR CLIENTES
-- =====================================================

-- 5.1 Deletar todos os clientes
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM clients;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Clientes deletados: %', deleted_count;
END $$;

-- =====================================================
-- ETAPA 6: REABILITAR CONSTRAINTS
-- =====================================================

-- Reabilitar verificação de foreign keys
SET session_replication_role = DEFAULT;

-- =====================================================
-- ETAPA 7: VERIFICAÇÃO FINAL
-- =====================================================

DO $$
DECLARE
    remaining_orders INTEGER;
    remaining_clients INTEGER;
    remaining_events INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orders FROM service_orders;
    SELECT COUNT(*) INTO remaining_clients FROM clients;
    SELECT COUNT(*) INTO remaining_events FROM service_events;
    
    RAISE NOTICE '=== LIMPEZA CONCLUÍDA ===';
    RAISE NOTICE 'Ordens de serviço restantes: %', remaining_orders;
    RAISE NOTICE 'Clientes restantes: %', remaining_clients;
    RAISE NOTICE 'Service events restantes: %', remaining_events;
    
    IF remaining_orders = 0 AND remaining_clients = 0 AND remaining_events = 0 THEN
        RAISE NOTICE '🎉 LIMPEZA REALIZADA COM SUCESSO!';
    ELSE
        RAISE WARNING '⚠️ Alguns registros podem não ter sido removidos';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================

-- NOTA: Se este script funcionar, você pode criar uma função RPC para uso futuro:
/*
CREATE OR REPLACE FUNCTION cleanup_all_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Código do script acima aqui
    RETURN 'Limpeza concluída com sucesso';
END;
$$;
*/
