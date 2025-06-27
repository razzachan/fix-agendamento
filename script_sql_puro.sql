-- =====================================================
-- LIMPEZA FORÇADA DEFINITIVA - Fix Fogões
-- Execute no SQL Editor do Supabase
-- =====================================================

BEGIN;

-- Desabilitar verificação de foreign keys
SET session_replication_role = replica;

-- 1. VERIFICAÇÃO INICIAL
SELECT 'VERIFICAÇÃO INICIAL' as status;
SELECT 'service_events' as tabela, COUNT(*) as registros FROM service_events;
SELECT 'service_orders' as tabela, COUNT(*) as registros FROM service_orders;
SELECT 'clients' as tabela, COUNT(*) as registros FROM clients;

-- 2. DELETAR DEPENDÊNCIAS PRIMEIRO
DELETE FROM service_order_comments;
DELETE FROM service_order_progress;
DELETE FROM service_order_images;
DELETE FROM financial_transactions;
DELETE FROM agendamentos_ai;

-- 3. FORÇAR EXCLUSÃO DE SERVICE_EVENTS (MÚLTIPLAS ABORDAGENS)
-- Abordagem 1: Deletar todos
DELETE FROM service_events;

-- Abordagem 2: Deletar por condições específicas
DELETE FROM service_events WHERE id IS NOT NULL;
DELETE FROM service_events WHERE created_at IS NOT NULL;
DELETE FROM service_events WHERE service_order_id IS NOT NULL;

-- Abordagem 3: Truncate (mais agressivo)
TRUNCATE TABLE service_events RESTART IDENTITY CASCADE;

-- 4. VERIFICAÇÃO INTERMEDIÁRIA
SELECT 'APÓS LIMPEZA service_events' as status;
SELECT COUNT(*) as eventos_restantes FROM service_events;

-- 5. DELETAR SERVICE_ORDERS (agora sem constraint)
DELETE FROM service_orders;

-- 6. DELETAR CLIENTES
DELETE FROM clients;

-- 7. REABILITAR CONSTRAINTS
SET session_replication_role = DEFAULT;

-- 8. VERIFICAÇÃO FINAL
SELECT 'VERIFICAÇÃO FINAL' as status;
SELECT 'service_events' as tabela, COUNT(*) as registros FROM service_events;
SELECT 'service_orders' as tabela, COUNT(*) as registros FROM service_orders;
SELECT 'clients' as tabela, COUNT(*) as registros FROM clients;

COMMIT;

-- 9. MENSAGEM FINAL
SELECT 'LIMPEZA CONCLUÍDA COM SUCESSO!' as resultado;
