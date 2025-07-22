-- 🔧 Script SQL para Corrigir client_id Faltantes na Tabela scheduled_services
-- Execute essas queries no SQL Editor do Supabase

-- ========================================
-- 1. ANÁLISE INICIAL - Ver quantos registros estão sem client_id
-- ========================================

-- Ver total de registros sem client_id
SELECT 
    COUNT(*) as total_sem_client_id,
    COUNT(CASE WHEN service_order_id IS NOT NULL THEN 1 END) as com_service_order_id,
    COUNT(CASE WHEN client_name IS NOT NULL AND client_name != '' THEN 1 END) as com_client_name
FROM scheduled_services 
WHERE client_id IS NULL;

-- Ver alguns exemplos dos registros sem client_id
SELECT 
    id,
    client_name,
    service_order_id,
    created_at,
    address
FROM scheduled_services 
WHERE client_id IS NULL 
ORDER BY created_at DESC 
LIMIT 10;

-- ========================================
-- 2. CORREÇÃO VIA SERVICE_ORDERS - Método mais confiável
-- ========================================

-- Ver quantos podem ser corrigidos via service_orders
SELECT 
    ss.id as scheduled_service_id,
    ss.client_name,
    ss.service_order_id,
    so.client_id,
    so.client_name as so_client_name
FROM scheduled_services ss
JOIN service_orders so ON ss.service_order_id = so.id
WHERE ss.client_id IS NULL 
  AND so.client_id IS NOT NULL
LIMIT 20;

-- EXECUTAR: Corrigir via service_orders (MAIS SEGURO)
UPDATE scheduled_services 
SET client_id = (
    SELECT so.client_id 
    FROM service_orders so 
    WHERE so.id = scheduled_services.service_order_id
)
WHERE client_id IS NULL 
  AND service_order_id IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM service_orders so 
    WHERE so.id = scheduled_services.service_order_id 
      AND so.client_id IS NOT NULL
  );

-- Verificar quantos foram corrigidos
SELECT COUNT(*) as corrigidos_via_service_orders
FROM scheduled_services ss
JOIN service_orders so ON ss.service_order_id = so.id
WHERE ss.client_id = so.client_id;

-- ========================================
-- 3. CORREÇÃO VIA NOME DO CLIENTE - Para registros restantes
-- ========================================

-- Ver registros que ainda precisam de correção
SELECT 
    COUNT(*) as ainda_sem_client_id
FROM scheduled_services 
WHERE client_id IS NULL;

-- Ver quais clientes podem ser encontrados por nome exato
SELECT 
    ss.id as scheduled_service_id,
    ss.client_name,
    c.id as client_id,
    c.name as client_db_name
FROM scheduled_services ss
JOIN clients c ON TRIM(ss.client_name) = TRIM(c.name)
WHERE ss.client_id IS NULL 
  AND ss.client_name IS NOT NULL 
  AND ss.client_name != ''
LIMIT 20;

-- EXECUTAR: Corrigir via nome exato
UPDATE scheduled_services 
SET client_id = (
    SELECT c.id 
    FROM clients c 
    WHERE TRIM(c.name) = TRIM(scheduled_services.client_name)
    LIMIT 1
)
WHERE client_id IS NULL 
  AND client_name IS NOT NULL 
  AND client_name != ''
  AND EXISTS (
    SELECT 1 
    FROM clients c 
    WHERE TRIM(c.name) = TRIM(scheduled_services.client_name)
  );

-- ========================================
-- 4. CORREÇÃO VIA NOME SIMILAR - Para nomes com pequenas diferenças
-- ========================================

-- Ver clientes que podem ser encontrados por similaridade
SELECT 
    ss.id as scheduled_service_id,
    ss.client_name,
    c.id as client_id,
    c.name as client_db_name,
    similarity(ss.client_name, c.name) as similaridade
FROM scheduled_services ss
JOIN clients c ON similarity(ss.client_name, c.name) > 0.7
WHERE ss.client_id IS NULL 
  AND ss.client_name IS NOT NULL 
  AND ss.client_name != ''
ORDER BY similarity(ss.client_name, c.name) DESC
LIMIT 20;

-- EXECUTAR: Corrigir via similaridade (CUIDADO - revisar antes)
-- Descomente apenas se tiver certeza dos resultados acima
/*
UPDATE scheduled_services 
SET client_id = (
    SELECT c.id 
    FROM clients c 
    WHERE similarity(c.name, scheduled_services.client_name) > 0.8
    ORDER BY similarity(c.name, scheduled_services.client_name) DESC
    LIMIT 1
)
WHERE client_id IS NULL 
  AND client_name IS NOT NULL 
  AND client_name != ''
  AND EXISTS (
    SELECT 1 
    FROM clients c 
    WHERE similarity(c.name, scheduled_services.client_name) > 0.8
  );
*/

-- ========================================
-- 5. CRIAR CLIENTES PARA REGISTROS RESTANTES
-- ========================================

-- Ver registros que ainda precisam de cliente
SELECT 
    id,
    client_name,
    address,
    created_at
FROM scheduled_services 
WHERE client_id IS NULL 
  AND client_name IS NOT NULL 
  AND client_name != ''
ORDER BY created_at DESC;

-- EXECUTAR: Criar novos clientes para nomes únicos
INSERT INTO clients (name, email, phone, address, created_at)
SELECT DISTINCT
    TRIM(ss.client_name) as name,
    LOWER(REPLACE(TRIM(ss.client_name), ' ', '.')) || '@cliente.com' as email,
    '' as phone,
    COALESCE(ss.address, '') as address,
    NOW() as created_at
FROM scheduled_services ss
WHERE ss.client_id IS NULL 
  AND ss.client_name IS NOT NULL 
  AND ss.client_name != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM clients c 
    WHERE TRIM(c.name) = TRIM(ss.client_name)
  );

-- EXECUTAR: Atualizar scheduled_services com os novos clientes criados
UPDATE scheduled_services 
SET client_id = (
    SELECT c.id 
    FROM clients c 
    WHERE TRIM(c.name) = TRIM(scheduled_services.client_name)
    LIMIT 1
)
WHERE client_id IS NULL 
  AND client_name IS NOT NULL 
  AND client_name != ''
  AND EXISTS (
    SELECT 1 
    FROM clients c 
    WHERE TRIM(c.name) = TRIM(scheduled_services.client_name)
  );

-- ========================================
-- 6. VERIFICAÇÃO FINAL
-- ========================================

-- Verificar quantos registros ainda estão sem client_id
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN client_id IS NULL THEN 1 END) as sem_client_id,
    COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) as com_client_id,
    ROUND(
        (COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as percentual_corrigido
FROM scheduled_services;

-- Ver registros que ainda estão sem client_id (se houver)
SELECT 
    id,
    client_name,
    service_order_id,
    address,
    created_at
FROM scheduled_services 
WHERE client_id IS NULL 
ORDER BY created_at DESC;

-- ========================================
-- 7. RELATÓRIO DETALHADO
-- ========================================

-- Relatório por método de correção
SELECT 
    'Via Service Orders' as metodo,
    COUNT(*) as quantidade
FROM scheduled_services ss
JOIN service_orders so ON ss.service_order_id = so.id
WHERE ss.client_id = so.client_id

UNION ALL

SELECT 
    'Via Nome Cliente' as metodo,
    COUNT(*) as quantidade
FROM scheduled_services ss
JOIN clients c ON ss.client_id = c.id
WHERE ss.service_order_id IS NULL
   OR NOT EXISTS (
       SELECT 1 FROM service_orders so 
       WHERE so.id = ss.service_order_id 
         AND so.client_id = ss.client_id
   )

UNION ALL

SELECT 
    'Ainda sem client_id' as metodo,
    COUNT(*) as quantidade
FROM scheduled_services 
WHERE client_id IS NULL;

-- ========================================
-- 8. QUERIES DE MANUTENÇÃO (OPCIONAL)
-- ========================================

-- Verificar integridade referencial
SELECT 
    ss.id,
    ss.client_id,
    ss.client_name,
    c.name as client_db_name
FROM scheduled_services ss
LEFT JOIN clients c ON ss.client_id = c.id
WHERE ss.client_id IS NOT NULL 
  AND c.id IS NULL;

-- Verificar duplicatas de clientes que podem ter sido criadas
SELECT 
    name,
    COUNT(*) as quantidade
FROM clients 
GROUP BY name 
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- ========================================
-- INSTRUÇÕES DE USO:
-- ========================================

/*
ORDEM DE EXECUÇÃO RECOMENDADA:

1. Execute as queries de ANÁLISE INICIAL para entender o problema
2. Execute a correção VIA SERVICE_ORDERS (mais segura)
3. Execute a correção VIA NOME DO CLIENTE
4. Se necessário, execute a correção VIA NOME SIMILAR (com cuidado)
5. Execute a criação de NOVOS CLIENTES para registros restantes
6. Execute as VERIFICAÇÕES FINAIS
7. Execute o RELATÓRIO DETALHADO

IMPORTANTE:
- Sempre execute as queries de SELECT primeiro para ver o que será alterado
- Faça backup antes de executar UPDATEs em massa
- Execute uma query por vez e verifique os resultados
- A correção via similaridade deve ser revisada manualmente
*/
