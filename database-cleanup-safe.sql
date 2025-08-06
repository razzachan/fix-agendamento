-- =====================================================
-- SCRIPT DE LIMPEZA SEGURO PARA MVP
-- =====================================================
-- Remove dados de clientes preservando usuários essenciais
-- PRESERVA: joaooficina@fixfogoes.com.br, betonipaulo@gmail.com, admin@fixfogoes.com.br
-- =====================================================

-- ETAPA 1: Identificar clientes para remoção
SELECT 'ETAPA 1: IDENTIFICANDO CLIENTES PARA REMOÇÃO' as status;

SELECT 
    id,
    email,
    raw_user_meta_data->>'name' as name,
    raw_user_meta_data->>'role' as role
FROM auth.users 
WHERE (raw_user_meta_data->>'role' = 'client'
   OR (raw_user_meta_data->>'role' IS NULL AND (email LIKE '%@teste.com%' OR email LIKE '%teste%')))
   AND email NOT IN (
       'joaooficina@fixfogoes.com.br',
       'betonipaulo@gmail.com', 
       'admin@fixfogoes.com.br'
   )
ORDER BY email;

-- Contar quantos serão removidos
SELECT 'Total de clientes a remover:' as info, count(*) as total
FROM auth.users 
WHERE (raw_user_meta_data->>'role' = 'client'
   OR (raw_user_meta_data->>'role' IS NULL AND (email LIKE '%@teste.com%' OR email LIKE '%teste%')))
   AND email NOT IN (
       'joaooficina@fixfogoes.com.br',
       'betonipaulo@gmail.com',
       'admin@fixfogoes.com.br'
   );
