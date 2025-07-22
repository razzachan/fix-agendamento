# 🔧 Guia: Corrigir client_id Faltantes no Supabase

## 📋 **Passo a Passo Simples**

### **🔍 1. ANÁLISE INICIAL**
Execute no SQL Editor do Supabase para ver o problema:

```sql
-- Ver quantos registros estão sem client_id
SELECT 
    COUNT(*) as total_sem_client_id
FROM scheduled_services 
WHERE client_id IS NULL;
```

### **🔧 2. CORREÇÃO PRINCIPAL (VIA SERVICE_ORDERS)**
Esta é a correção mais segura - execute primeiro:

```sql
-- Corrigir usando service_orders (MAIS SEGURO)
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
```

### **🔧 3. CORREÇÃO SECUNDÁRIA (VIA NOME)**
Para registros que ainda estão sem client_id:

```sql
-- Corrigir usando nome exato do cliente
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
```

### **🆕 4. CRIAR CLIENTES FALTANTES**
Para registros que ainda não têm cliente:

```sql
-- Criar novos clientes
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
```

### **🔗 5. VINCULAR NOVOS CLIENTES**
Depois de criar os clientes, vincular aos agendamentos:

```sql
-- Vincular os novos clientes criados
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
```

### **✅ 6. VERIFICAÇÃO FINAL**
Confirmar que tudo foi corrigido:

```sql
-- Ver resultado final
SELECT 
    COUNT(*) as total_registros,
    COUNT(CASE WHEN client_id IS NULL THEN 1 END) as sem_client_id,
    COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) as com_client_id,
    ROUND(
        (COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as percentual_corrigido
FROM scheduled_services;
```

## 🎯 **Execução Rápida (Copie e Cole)**

Se quiser executar tudo de uma vez, copie este bloco:

```sql
-- 1. Ver problema inicial
SELECT COUNT(*) as registros_sem_client_id FROM scheduled_services WHERE client_id IS NULL;

-- 2. Corrigir via service_orders
UPDATE scheduled_services 
SET client_id = (SELECT so.client_id FROM service_orders so WHERE so.id = scheduled_services.service_order_id)
WHERE client_id IS NULL AND service_order_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM service_orders so WHERE so.id = scheduled_services.service_order_id AND so.client_id IS NOT NULL);

-- 3. Corrigir via nome do cliente
UPDATE scheduled_services 
SET client_id = (SELECT c.id FROM clients c WHERE TRIM(c.name) = TRIM(scheduled_services.client_name) LIMIT 1)
WHERE client_id IS NULL AND client_name IS NOT NULL AND client_name != ''
  AND EXISTS (SELECT 1 FROM clients c WHERE TRIM(c.name) = TRIM(scheduled_services.client_name));

-- 4. Criar clientes faltantes
INSERT INTO clients (name, email, phone, address, created_at)
SELECT DISTINCT TRIM(ss.client_name), LOWER(REPLACE(TRIM(ss.client_name), ' ', '.')) || '@cliente.com', '', COALESCE(ss.address, ''), NOW()
FROM scheduled_services ss
WHERE ss.client_id IS NULL AND ss.client_name IS NOT NULL AND ss.client_name != ''
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE TRIM(c.name) = TRIM(ss.client_name));

-- 5. Vincular novos clientes
UPDATE scheduled_services 
SET client_id = (SELECT c.id FROM clients c WHERE TRIM(c.name) = TRIM(scheduled_services.client_name) LIMIT 1)
WHERE client_id IS NULL AND client_name IS NOT NULL AND client_name != ''
  AND EXISTS (SELECT 1 FROM clients c WHERE TRIM(c.name) = TRIM(scheduled_services.client_name));

-- 6. Verificar resultado
SELECT COUNT(*) as total, COUNT(CASE WHEN client_id IS NULL THEN 1 END) as sem_client_id, 
       COUNT(CASE WHEN client_id IS NOT NULL THEN 1 END) as com_client_id
FROM scheduled_services;
```

## 📊 **O Que Cada Query Faz**

### **🔧 Query 1 - Correção via service_orders:**
- **O que faz**: Pega o `client_id` da tabela `service_orders` e copia para `scheduled_services`
- **Quando usar**: Primeira opção - mais confiável
- **Resultado esperado**: Corrige a maioria dos registros

### **🔧 Query 2 - Correção via nome:**
- **O que faz**: Procura cliente na tabela `clients` pelo nome exato
- **Quando usar**: Para registros que não têm `service_order_id`
- **Resultado esperado**: Corrige registros com nomes que já existem

### **🆕 Query 3 - Criar clientes:**
- **O que faz**: Cria novos registros na tabela `clients` para nomes únicos
- **Quando usar**: Para clientes que não existem no sistema
- **Resultado esperado**: Cria clientes faltantes

### **🔗 Query 4 - Vincular clientes:**
- **O que faz**: Liga os agendamentos aos clientes recém-criados
- **Quando usar**: Depois de criar os clientes
- **Resultado esperado**: Completa a correção

## ⚠️ **Cuidados Importantes**

### **✅ Antes de Executar:**
1. **Faça backup** da tabela `scheduled_services`
2. **Execute as queries de SELECT** primeiro para ver o que será alterado
3. **Execute uma query por vez** e verifique os resultados

### **🔍 Queries de Verificação:**
```sql
-- Ver registros que serão afetados ANTES de executar UPDATE
SELECT id, client_name, service_order_id 
FROM scheduled_services 
WHERE client_id IS NULL 
LIMIT 10;

-- Ver se existem clientes duplicados
SELECT name, COUNT(*) 
FROM clients 
GROUP BY name 
HAVING COUNT(*) > 1;
```

## 🎯 **Resultado Esperado**

Após executar todas as queries:
- ✅ **95-100%** dos registros com `client_id` preenchido
- ✅ **Integridade referencial** preservada
- ✅ **Novos clientes** criados quando necessário
- ✅ **Relacionamentos** corretos entre tabelas

## 📞 **Se Precisar de Ajuda**

Se alguma query não funcionar ou der erro:
1. **Copie a mensagem de erro** completa
2. **Verifique** se as tabelas `scheduled_services`, `service_orders` e `clients` existem
3. **Execute** as queries de verificação primeiro

**Pronto! Com essas queries você vai corrigir todos os `client_id` faltantes na tabela `scheduled_services`. 🔧✨**
