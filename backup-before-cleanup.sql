-- =====================================================
-- SCRIPT DE BACKUP ANTES DA LIMPEZA
-- Fix Fogões - Backup dos dados antes da exclusão
-- =====================================================

-- IMPORTANTE: Execute este script ANTES da limpeza para criar backup
-- Este script cria tabelas temporárias com os dados que serão removidos

BEGIN;

-- =====================================================
-- ETAPA 1: CRIAR TABELAS DE BACKUP
-- =====================================================

-- 1.1 Backup das ordens de serviço
CREATE TABLE IF NOT EXISTS backup_service_orders AS
SELECT * FROM service_orders;

-- 1.2 Backup dos clientes
CREATE TABLE IF NOT EXISTS backup_clients AS
SELECT * FROM clients;

-- 1.3 Backup dos comentários
CREATE TABLE IF NOT EXISTS backup_service_order_comments AS
SELECT * FROM service_order_comments 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 1.4 Backup do progresso
CREATE TABLE IF NOT EXISTS backup_service_order_progress AS
SELECT * FROM service_order_progress 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 1.5 Backup dos eventos
CREATE TABLE IF NOT EXISTS backup_service_events AS
SELECT * FROM service_events 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 1.6 Backup das imagens
CREATE TABLE IF NOT EXISTS backup_service_order_images AS
SELECT * FROM service_order_images 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 1.7 Backup das transações financeiras
CREATE TABLE IF NOT EXISTS backup_financial_transactions AS
SELECT * FROM financial_transactions 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- 1.8 Backup das notificações
CREATE TABLE IF NOT EXISTS backup_notifications AS
SELECT * FROM notifications 
WHERE related_id IN (SELECT id FROM service_orders);

-- 1.9 Backup dos agendamentos AI
CREATE TABLE IF NOT EXISTS backup_agendamentos_ai AS
SELECT * FROM agendamentos_ai 
WHERE service_order_id IN (SELECT id FROM service_orders);

-- =====================================================
-- ETAPA 2: VERIFICAR BACKUPS CRIADOS
-- =====================================================

DO $$
DECLARE
    backup_record RECORD;
    total_backups INTEGER := 0;
BEGIN
    RAISE NOTICE '=== BACKUPS CRIADOS ===';
    
    FOR backup_record IN 
        SELECT 
            table_name,
            (SELECT COUNT(*) FROM information_schema.tables 
             WHERE table_name = 'backup_' || t.table_name) as backup_exists,
            (CASE 
                WHEN table_name = 'service_orders' THEN (SELECT COUNT(*) FROM backup_service_orders)
                WHEN table_name = 'clients' THEN (SELECT COUNT(*) FROM backup_clients)
                WHEN table_name = 'service_order_comments' THEN (SELECT COUNT(*) FROM backup_service_order_comments)
                WHEN table_name = 'service_order_progress' THEN (SELECT COUNT(*) FROM backup_service_order_progress)
                WHEN table_name = 'service_events' THEN (SELECT COUNT(*) FROM backup_service_events)
                WHEN table_name = 'service_order_images' THEN (SELECT COUNT(*) FROM backup_service_order_images)
                WHEN table_name = 'financial_transactions' THEN (SELECT COUNT(*) FROM backup_financial_transactions)
                WHEN table_name = 'notifications' THEN (SELECT COUNT(*) FROM backup_notifications)
                WHEN table_name = 'agendamentos_ai' THEN (SELECT COUNT(*) FROM backup_agendamentos_ai)
                ELSE 0
            END) as record_count
        FROM (VALUES 
            ('service_orders'),
            ('clients'),
            ('service_order_comments'),
            ('service_order_progress'),
            ('service_events'),
            ('service_order_images'),
            ('financial_transactions'),
            ('notifications'),
            ('agendamentos_ai')
        ) AS t(table_name)
    LOOP
        RAISE NOTICE 'Backup de %: % registros', backup_record.table_name, backup_record.record_count;
        total_backups := total_backups + backup_record.record_count;
    END LOOP;
    
    RAISE NOTICE 'Total de registros em backup: %', total_backups;
    RAISE NOTICE '✅ Backup concluído com sucesso!';
END $$;

-- =====================================================
-- ETAPA 3: INSTRUÇÕES PARA RESTAURAÇÃO
-- =====================================================

-- Para restaurar os dados (se necessário), execute:
/*
-- RESTAURAR CLIENTES
INSERT INTO clients SELECT * FROM backup_clients;

-- RESTAURAR ORDENS DE SERVIÇO
INSERT INTO service_orders SELECT * FROM backup_service_orders;

-- RESTAURAR DADOS DEPENDENTES
INSERT INTO service_order_comments SELECT * FROM backup_service_order_comments;
INSERT INTO service_order_progress SELECT * FROM backup_service_order_progress;
INSERT INTO service_events SELECT * FROM backup_service_events;
INSERT INTO service_order_images SELECT * FROM backup_service_order_images;
INSERT INTO financial_transactions SELECT * FROM backup_financial_transactions;
INSERT INTO notifications SELECT * FROM backup_notifications;
INSERT INTO agendamentos_ai SELECT * FROM backup_agendamentos_ai;
*/

-- =====================================================
-- ETAPA 4: LIMPEZA DOS BACKUPS (OPCIONAL)
-- =====================================================

-- Para remover as tabelas de backup após confirmar que não são mais necessárias:
/*
DROP TABLE IF EXISTS backup_service_orders;
DROP TABLE IF EXISTS backup_clients;
DROP TABLE IF EXISTS backup_service_order_comments;
DROP TABLE IF EXISTS backup_service_order_progress;
DROP TABLE IF EXISTS backup_service_events;
DROP TABLE IF EXISTS backup_service_order_images;
DROP TABLE IF EXISTS backup_financial_transactions;
DROP TABLE IF EXISTS backup_notifications;
DROP TABLE IF EXISTS backup_agendamentos_ai;
*/

COMMIT;

-- =====================================================
-- BACKUP CONCLUÍDO
-- =====================================================
