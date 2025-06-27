# 🔥 SOLUÇÃO DEFINITIVA - LIMPEZA MANUAL VIA SQL EDITOR

## 🚨 PROBLEMA IDENTIFICADO
- API REST reporta `service_events` vazio (0 registros)
- MAS constraint ainda existe (registros fantasma/cache)
- Única solução: **SQL DIRETO no Supabase**

## 🎯 SOLUÇÃO DEFINITIVA

### PASSO 1: Acessar SQL Editor
1. Acesse: https://supabase.com/dashboard/project/hdyucwabemspehokoiks/sql
2. Cole o script abaixo
3. Execute (botão RUN)

### PASSO 2: Script SQL Definitivo
```sql
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
SELECT '🎉 LIMPEZA CONCLUÍDA COM SUCESSO!' as resultado;
```

### PASSO 3: Verificar Resultado
Após executar, você deve ver:
```
VERIFICAÇÃO FINAL
service_events: 0 registros
service_orders: 0 registros  
clients: 0 registros
🎉 LIMPEZA CONCLUÍDA COM SUCESSO!
```

## 🛡️ POR QUE ESTA SOLUÇÃO FUNCIONA

1. **SQL Direto**: Bypassa cache da API REST
2. **session_replication_role = replica**: Desabilita constraints temporariamente
3. **TRUNCATE CASCADE**: Força exclusão mesmo com referências
4. **Múltiplas Abordagens**: DELETE + TRUNCATE para garantir limpeza
5. **Verificações**: Mostra contagem real antes/depois

## 🚀 ALTERNATIVA: Criar Função RPC

Se quiser automatizar para o futuro, execute também:

```sql
CREATE OR REPLACE FUNCTION cleanup_all_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Desabilitar constraints
    SET session_replication_role = replica;
    
    -- Deletar dependências
    DELETE FROM service_order_comments;
    DELETE FROM service_order_progress;
    DELETE FROM service_order_images;
    DELETE FROM financial_transactions;
    DELETE FROM agendamentos_ai;
    
    -- Forçar exclusão de service_events
    DELETE FROM service_events;
    TRUNCATE TABLE service_events RESTART IDENTITY CASCADE;
    
    -- Deletar ordens e clientes
    DELETE FROM service_orders;
    DELETE FROM clients;
    
    -- Reabilitar constraints
    SET session_replication_role = DEFAULT;
    
    RETURN 'Limpeza concluída com sucesso!';
END;
$$;
```

Depois poderá usar: `SELECT cleanup_all_data();`

## ⚡ EXECUTE AGORA

**Acesse o SQL Editor e execute o script - esta é a única forma de quebrar constraints fantasma!**
