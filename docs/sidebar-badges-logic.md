# 🎯 Lógica Otimizada dos Badges do Menu Lateral

## 📊 **VISÃO GERAL**

A nova lógica dos badges foi redesenhada para ser **orientada à ação** e **focada em urgência**, mostrando apenas itens que realmente precisam de atenção imediata da equipe.

---

## 🔴 **BADGES PRINCIPAIS**

### **📋 Ordens de Serviço (URGENTES)**
**Critério:** Ordens que precisam de ação IMEDIATA
- ✅ Ordens em aberto (`pending`) - precisam ser agendadas
- ✅ Ordens agendadas para hoje ou atrasadas
- ❌ Ordens agendadas para o futuro (não urgentes)

**SQL:** `status = 'pending' OR (status = 'scheduled' AND scheduled_date <= TODAY)`

### **🔧 Reparos (ATENÇÃO NECESSÁRIA)**
**Critério:** Reparos com possíveis problemas ou atrasos
- ✅ Reparos em andamento há mais de 5 dias
- ✅ Equipamentos na oficina há mais de 7 dias  
- ✅ Orçamentos aprovados aguardando início
- ❌ Reparos recentes em andamento normal

### **💳 Orçamentos (PENDÊNCIAS)**
**Critério:** Orçamentos que precisam de follow-up
- ✅ Orçamentos enviados há mais de 2 dias sem resposta
- ✅ Diagnósticos concluídos aguardando orçamento
- ❌ Orçamentos enviados recentemente

### **🚚 Entregas (URGENTES)**
**Critério:** Entregas que precisam de ação
- ✅ Equipamentos prontos há mais de 2 dias
- ✅ Entregas agendadas para hoje
- ❌ Equipamentos recém-finalizados

### **💰 Financeiro (PROBLEMAS)**
**Critério:** Questões financeiras críticas
- ✅ Pagamentos em atraso (concluído há +3 dias sem pagamento)
- ✅ Valores altos (>R$ 500) aguardando pagamento
- ✅ Pagamentos parciais pendentes
- ❌ Pagamentos recentes normais

### **🏭 Oficinas (GARGALOS)**
**Critério:** Gargalos na oficina
- ✅ Equipamentos na oficina há mais de 7 dias
- ✅ Diagnósticos pendentes há mais de 3 dias
- ❌ Trabalhos recentes normais

### **📍 Rastreamento (SLA)**
**Critério:** Violações críticas de SLA
- ✅ Ordens em aberto há mais de 24h
- ✅ Agendamentos atrasados
- ✅ Reparos parados há mais de 7 dias
- ✅ Equipamentos prontos há mais de 5 dias

---

## 🎯 **BENEFÍCIOS DA NOVA LÓGICA**

### **1. Orientada à Ação**
- Mostra apenas itens que precisam de intervenção
- Elimina "ruído" de itens em andamento normal
- Foca na resolução de problemas

### **2. Baseada em Prazos**
- Considera tempo decorrido desde última ação
- Identifica possíveis atrasos automaticamente
- Previne violações de SLA

### **3. Priorização Inteligente**
- Valores altos têm prioridade no financeiro
- Ordens antigas têm prioridade sobre novas
- Clientes aguardando têm prioridade

### **4. Redução de Falsos Positivos**
- Não conta itens em andamento normal
- Não alerta para situações esperadas
- Foca em exceções e problemas

---

## 📈 **COMPARAÇÃO: ANTES vs. DEPOIS**

### **ANTES (Lógica Simples)**
```sql
-- Ordens: TODAS pendentes + agendadas
SELECT COUNT(*) WHERE status IN ('pending', 'scheduled')
-- Resultado: 15 ordens (muitas futuras normais)

-- Reparos: TODOS em andamento
SELECT COUNT(*) WHERE status IN ('in_progress', 'at_workshop') 
-- Resultado: 8 reparos (incluindo normais)
```

### **DEPOIS (Lógica Inteligente)**
```sql
-- Ordens: APENAS urgentes
SELECT COUNT(*) WHERE status = 'pending' 
   OR (status = 'scheduled' AND scheduled_date <= TODAY)
-- Resultado: 4 ordens (apenas as que precisam de ação)

-- Reparos: APENAS com possíveis problemas
SELECT COUNT(*) WHERE 
   (status = 'in_progress' AND updated_at <= DATE_SUB(NOW(), 5))
   OR (status = 'at_workshop' AND updated_at <= DATE_SUB(NOW(), 7))
   OR status = 'quote_approved'
-- Resultado: 2 reparos (apenas os problemáticos)
```

---

## 🚀 **RESULTADO ESPERADO**

### **Redução de Ruído**
- 70% menos badges "falso-positivos"
- Foco apenas em itens críticos
- Melhor produtividade da equipe

### **Detecção Proativa**
- Identifica problemas antes do cliente reclamar
- Previne violações de SLA
- Melhora satisfação do cliente

### **Gestão Eficiente**
- Priorização automática de tarefas
- Visibilidade de gargalos
- Tomada de decisão baseada em dados

---

## ⚙️ **CONFIGURAÇÕES AJUSTÁVEIS**

Os prazos podem ser facilmente ajustados conforme necessário:

```typescript
// Prazos atuais (em dias)
const THRESHOLDS = {
  PENDING_ORDER_ALERT: 1,      // Ordens em aberto
  REPAIR_DELAY_ALERT: 5,       // Reparos em andamento
  WORKSHOP_DELAY_ALERT: 7,     // Na oficina
  QUOTE_FOLLOWUP: 2,           // Orçamentos sem resposta
  DELIVERY_ALERT: 2,           // Prontos para entrega
  PAYMENT_OVERDUE: 3,          // Pagamentos em atraso
  DIAGNOSIS_DELAY: 3           // Diagnósticos pendentes
};
```

Esta nova lógica transforma os badges de simples contadores em **ferramentas inteligentes de gestão**, focando a atenção da equipe onde realmente importa! 🎯
