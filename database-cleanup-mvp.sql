-- =====================================================
-- SCRIPT DE LIMPEZA DO BANCO PARA MVP
-- =====================================================
-- Remove todos os dados de clientes e ordens de serviço
-- Mantém: admin, technician, workshop
-- Remove: client e todos os dados relacionados
-- =====================================================

-- IMPORTANTE: Execute este script em ordem para manter integridade referencial

BEGIN;

-- =====================================================
-- 1. IDENTIFICAR CLIENTES A SEREM REMOVIDOS
-- =====================================================
-- Criar tabela temporária com IDs dos clientes
-- PRESERVAR USUÁRIOS ESSENCIAIS:
-- - joaooficina@fixfogoes.com.br
-- - betonipaulo@gmail.com
-- - admin@fixfogoes.com.br
CREATE TEMP TABLE clients_to_delete AS
SELECT id, email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE (raw_user_meta_data->>'role' = 'client'
   OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%@teste.com%')
   OR (raw_user_meta_data->>'role' IS NULL AND email LIKE '%teste%'))
   AND email NOT IN (
       'joaooficina@fixfogoes.com.br',
       'betonipaulo@gmail.com',
       'admin@fixfogoes.com.br'
   );

-- Mostrar quantos clientes serão removidos
SELECT 'CLIENTES A SEREM REMOVIDOS:' as info, count(*) as total FROM clients_to_delete;

-- =====================================================
-- 2. REMOVER DADOS RELACIONADOS (ORDEM IMPORTA!)
-- =====================================================

-- 2.1 Remover avaliações de clientes
DELETE FROM customer_ratings 
WHERE customer_id IN (SELECT id FROM clients_to_delete);

-- 2.2 Remover fotos de serviços relacionadas a ordens de clientes
DELETE FROM service_photos 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.3 Remover check-ins de técnicos relacionados a ordens de clientes
DELETE FROM technician_checkins 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.4 Remover comentários de ordens de serviço
DELETE FROM service_order_comments 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.5 Remover imagens de ordens de serviço
DELETE FROM service_order_images 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.6 Remover progresso de ordens de serviço
DELETE FROM service_order_progress 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.7 Remover ações de ordens de serviço
DELETE FROM service_order_actions 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.8 Remover itens de serviço
DELETE FROM service_items 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.9 Remover eventos de serviço
DELETE FROM service_events 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.10 Remover feedback de serviços
DELETE FROM service_feedback 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.11 Remover histórico de valores de ordens
DELETE FROM order_value_history 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.12 Remover pagamentos
DELETE FROM payments 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.13 Remover transações financeiras
DELETE FROM financial_transactions 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.14 Remover diagnósticos de equipamentos
DELETE FROM equipment_diagnostics 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.15 Remover códigos QR de equipamentos
DELETE FROM equipment_qr_codes 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- 2.16 Remover eventos de rastreamento QR
DELETE FROM qr_tracking_events 
WHERE equipment_qr_id IN (
    SELECT id FROM equipment_qr_codes 
    WHERE service_order_id IN (
        SELECT id FROM service_orders 
        WHERE client_id IN (SELECT id FROM clients_to_delete)
    )
);

-- 2.17 Remover serviços de garantia
DELETE FROM warranty_services 
WHERE service_order_id IN (
    SELECT id FROM service_orders 
    WHERE client_id IN (SELECT id FROM clients_to_delete)
);

-- =====================================================
-- 3. REMOVER SERVIÇOS AGENDADOS
-- =====================================================

-- 3.1 Remover serviços agendados de clientes
DELETE FROM scheduled_services 
WHERE client_id IN (SELECT id FROM clients_to_delete);

-- =====================================================
-- 4. REMOVER EVENTOS DO CALENDÁRIO
-- =====================================================

-- 4.1 Remover eventos do calendário relacionados a clientes
DELETE FROM calendar_events 
WHERE client_id IN (SELECT id FROM clients_to_delete);

-- =====================================================
-- 5. REMOVER ORDENS DE SERVIÇO
-- =====================================================

-- 5.1 Remover ordens de serviço de clientes
DELETE FROM service_orders 
WHERE client_id IN (SELECT id FROM clients_to_delete);

-- =====================================================
-- 6. REMOVER DADOS DE CLIENTES
-- =====================================================

-- 6.1 Remover da tabela clients
DELETE FROM clients 
WHERE user_id IN (SELECT id FROM clients_to_delete);

-- 6.2 Remover perfis de clientes
DELETE FROM profiles 
WHERE id IN (SELECT id FROM clients_to_delete);

-- 6.3 Remover notificações de clientes
DELETE FROM notifications 
WHERE user_id IN (SELECT id FROM clients_to_delete);

-- =====================================================
-- 7. REMOVER DADOS ADICIONAIS
-- =====================================================

-- 7.1 Remover agendamentos AI de clientes
DELETE FROM agendamentos_ai 
WHERE email IN (SELECT email FROM clients_to_delete);

-- 7.2 Remover tentativas de check-in
DELETE FROM check_in_attempts 
WHERE user_id IN (SELECT id FROM clients_to_delete);

-- 7.3 Remover conversões do Google Ads relacionadas
DELETE FROM google_ads_conversions 
WHERE user_id IN (SELECT id FROM clients_to_delete);

-- 7.4 Remover histórico de reciclagem
DELETE FROM recycle_history 
WHERE user_id IN (SELECT id FROM clients_to_delete);

-- 7.5 Remover rotas relacionadas a clientes
DELETE FROM routes 
WHERE client_id IN (SELECT id FROM clients_to_delete);

-- =====================================================
-- 8. REMOVER USUÁRIOS CLIENTES DA AUTENTICAÇÃO
-- =====================================================

-- 8.1 Remover usuários clientes do auth.users
DELETE FROM auth.users 
WHERE id IN (SELECT id FROM clients_to_delete);

-- =====================================================
-- 9. LIMPEZA FINAL E VERIFICAÇÃO
-- =====================================================

-- Mostrar estatísticas finais
SELECT 'USUÁRIOS RESTANTES POR ROLE:' as info;
SELECT 
    COALESCE(raw_user_meta_data->>'role', 'sem_role') as role,
    count(*) as total
FROM auth.users 
GROUP BY raw_user_meta_data->>'role'
ORDER BY role;

SELECT 'ORDENS DE SERVIÇO RESTANTES:' as info, count(*) as total FROM service_orders;
SELECT 'EVENTOS DO CALENDÁRIO RESTANTES:' as info, count(*) as total FROM calendar_events;
SELECT 'CLIENTES RESTANTES:' as info, count(*) as total FROM clients;

-- Limpar tabela temporária
DROP TABLE clients_to_delete;

COMMIT;

-- =====================================================
-- SCRIPT CONCLUÍDO
-- =====================================================
-- Todos os dados de clientes foram removidos
-- Sistema pronto para MVP com dados limpos
-- Mantidos: admin, technician, workshop
-- =====================================================
