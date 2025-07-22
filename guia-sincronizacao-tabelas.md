# 🔧 Guia: Sincronização de Tabelas service_orders ↔ scheduled_services

## 🎯 **Objetivo**
Verificar e corrigir inconsistências entre as tabelas `service_orders` e `scheduled_services`, garantindo que:
- Toda OS com agendamento tenha um registro correspondente em `scheduled_services`
- Não existam agendamentos órfãos (sem OS vinculada)
- Os dados estejam consistentes entre as tabelas

## 📊 **Problemas Identificados**

### **1. OS Órfãs**
- Ordens de serviço com `scheduled_date` e `technician_id`
- Mas sem registro correspondente em `scheduled_services`
- **Causa**: Middleware antigo não criava agendamentos específicos

### **2. Agendamentos Órfãos**
- Registros em `scheduled_services` sem OS vinculada
- Ou vinculados a OS canceladas/completadas
- **Causa**: OS removidas mas agendamentos não limpos

### **3. Dados Inconsistentes**
- Nome do cliente diferente entre as tabelas
- Técnico diferente entre as tabelas
- Datas não sincronizadas

## 🛠️ **Ferramentas Disponíveis**

### **1. 📋 Script SQL (verificar-sincronizar-tabelas.sql)**
- **Uso**: Análise manual no SQL Editor do Supabase
- **Funcionalidade**: Análise completa + comandos de correção
- **Segurança**: Comandos de correção comentados (DRY RUN por padrão)

### **2. 🔧 Script TypeScript (src/scripts/sincronizar-tabelas.ts)**
- **Uso**: Execução programática
- **Funcionalidade**: Análise + correção automática
- **Segurança**: Modo DRY RUN por padrão

## 📋 **Passo a Passo**

### **ETAPA 1: Análise Inicial (SQL)**

1. **Abra o SQL Editor do Supabase**
2. **Execute o script**: `verificar-sincronizar-tabelas.sql`
3. **Analise os resultados**:

```sql
-- Resultados esperados:
-- 1. Estrutura das tabelas
-- 2. Contagem de registros
-- 3. Lista de OS órfãs
-- 4. Lista de agendamentos órfãos
-- 5. Duplicações potenciais
-- 6. Inconsistências de dados
```

### **ETAPA 2: Análise Programática (TypeScript)**

1. **Configure as variáveis de ambiente**:
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=sua_url
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
```

2. **Execute a análise**:
```bash
# Modo DRY RUN (apenas análise)
npx tsx src/scripts/sincronizar-tabelas.ts

# Resultados esperados:
# 📊 ANÁLISE DAS TABELAS
# 📦 service_orders com agendamento: 45
# 📅 scheduled_services: 38
# 🔍 OS ÓRFÃS (7):
#   📦 OS001 - João Silva - 23/07/2025
#   📦 OS002 - Maria Santos - 24/07/2025
# 👻 AGENDAMENTOS ÓRFÃOS (2):
#   📅 abc12345 - Cliente Teste - 20/07/2025
```

### **ETAPA 3: Correção (Escolha uma opção)**

#### **Opção A: Correção Manual (SQL)**
```sql
-- 1. Descomente os comandos no script SQL
-- 2. Execute seção por seção
-- 3. Verifique os resultados

-- Exemplo:
INSERT INTO scheduled_services (...)
SELECT ... FROM service_orders so
WHERE ... -- condições específicas
```

#### **Opção B: Correção Automática (TypeScript)**
```bash
# ATENÇÃO: Isso fará alterações reais no banco!
npx tsx src/scripts/sincronizar-tabelas.ts --execute

# Resultados esperados:
# 🔧 INICIANDO SINCRONIZAÇÃO
# 📦 Criando agendamentos para 7 OS órfãs...
#   ✅ Agendamento criado para OS OS001
#   ✅ Agendamento criado para OS OS002
# 👻 Removendo 2 agendamentos órfãos...
#   ✅ Agendamento abc12345 removido
# ✅ SINCRONIZAÇÃO CONCLUÍDA
```

### **ETAPA 4: Verificação Final**

1. **Execute novamente a análise**:
```bash
npx tsx src/scripts/sincronizar-tabelas.ts
```

2. **Verifique se**:
   - ✅ OS órfãs: 0
   - ✅ Agendamentos órfãos: 0
   - ✅ Inconsistências: 0

3. **Teste o calendário**:
   - Verifique se todos os agendamentos aparecem
   - Confirme que não há duplicação

## 🔍 **Comandos de Verificação**

### **Verificar Estrutura das Tabelas**
```sql
-- service_orders
\d service_orders

-- scheduled_services  
\d scheduled_services
```

### **Contar Registros**
```sql
SELECT 
    (SELECT COUNT(*) FROM service_orders WHERE scheduled_date IS NOT NULL) as os_agendadas,
    (SELECT COUNT(*) FROM scheduled_services) as agendamentos_total,
    (SELECT COUNT(*) FROM scheduled_services WHERE service_order_id IS NOT NULL) as agendamentos_vinculados;
```

### **Verificar Consistência**
```sql
-- OS sem agendamento
SELECT COUNT(*) as os_sem_agendamento
FROM service_orders so
LEFT JOIN scheduled_services ss ON ss.service_order_id = so.id
WHERE so.scheduled_date IS NOT NULL 
  AND so.technician_id IS NOT NULL
  AND ss.id IS NULL
  AND so.status NOT IN ('cancelled', 'completed');

-- Agendamentos órfãos
SELECT COUNT(*) as agendamentos_orfaos
FROM scheduled_services ss
LEFT JOIN service_orders so ON so.id = ss.service_order_id
WHERE ss.service_order_id IS NULL 
   OR so.id IS NULL 
   OR so.status IN ('cancelled', 'completed');
```

## ⚠️ **Cuidados Importantes**

### **1. Backup**
```sql
-- Fazer backup antes das correções
CREATE TABLE service_orders_backup AS SELECT * FROM service_orders;
CREATE TABLE scheduled_services_backup AS SELECT * FROM scheduled_services;
```

### **2. Teste em Ambiente de Desenvolvimento**
- Execute primeiro em ambiente de teste
- Verifique os resultados
- Só depois execute em produção

### **3. Modo DRY RUN**
- Sempre execute primeiro em modo DRY RUN
- Analise os resultados antes de aplicar
- Use `--execute` apenas quando tiver certeza

### **4. Monitoramento**
- Acompanhe os logs durante a execução
- Verifique se não há erros
- Teste o calendário após as correções

## 📊 **Resultados Esperados**

### **Antes da Sincronização**
```
📦 service_orders com agendamento: 45
📅 scheduled_services: 38
🔍 OS órfãs: 7
👻 Agendamentos órfãos: 2
⚠️ Inconsistências: 3
```

### **Depois da Sincronização**
```
📦 service_orders com agendamento: 45
📅 scheduled_services: 45
🔍 OS órfãs: 0
👻 Agendamentos órfãos: 0
⚠️ Inconsistências: 0
```

## 🎯 **Benefícios da Sincronização**

1. **✅ Calendário Consistente**
   - Todos os agendamentos aparecem
   - Não há duplicação
   - Dados corretos

2. **✅ Performance Melhorada**
   - Menos dados órfãos
   - Consultas mais eficientes
   - Cache otimizado

3. **✅ Manutenibilidade**
   - Dados organizados
   - Relacionamentos corretos
   - Debugging facilitado

4. **✅ Experiência do Usuário**
   - Técnicos veem todos os agendamentos
   - Admin tem visão completa
   - Sistema mais confiável

## 🚀 **Próximos Passos**

Após a sincronização:

1. **Monitorar** o sistema por alguns dias
2. **Verificar** se novos agendamentos estão sendo criados corretamente
3. **Implementar** validações para evitar inconsistências futuras
4. **Documentar** o processo para a equipe

**A sincronização garante que o sistema funcione de forma consistente e confiável! 🎯**
