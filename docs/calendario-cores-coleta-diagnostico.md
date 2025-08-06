# 🎨 Sistema de Cores do Calendário - Processo de Coleta Diagnóstico

## 📋 **VISÃO GERAL**

O sistema de cores do calendário foi refinado para fornecer identificação visual específica para cada etapa do processo de coleta diagnóstico, permitindo que técnicos e administradores identifiquem rapidamente o status de cada ordem de serviço.

## 🔄 **FLUXO COMPLETO DE CORES**

### **🔵 AZUL - Agendado/Confirmado**
- **Status:** `scheduled`, `scheduled_collection`, `pending`
- **Cor:** `bg-blue-100 border-blue-300 text-blue-800`
- **Significado:** Serviço agendado e confirmado para coleta
- **Ação:** Técnico deve se preparar para a coleta

### **🟣 ROXO - Em Trânsito/Coleta**
- **Status:** `on_the_way`, `collected`, `collected_for_diagnosis`
- **Cor:** `bg-purple-100 border-purple-300 text-purple-800`
- **Significado:** Técnico em rota ou equipamento coletado
- **Ação:** Equipamento sendo transportado para oficina

### **🟠 LARANJA - Na Oficina (Recebido)**
- **Status:** `at_workshop`, `received_at_workshop`
- **Cor:** `bg-orange-100 border-orange-300 text-orange-800`
- **Significado:** Equipamento chegou na oficina
- **Ação:** Aguardando início do diagnóstico

### **🔵 CIANO - Em Diagnóstico**
- **Status:** `in_progress` (para coleta diagnóstico)
- **Cor:** `bg-cyan-100 border-cyan-300 text-cyan-800`
- **Significado:** Técnico realizando diagnóstico
- **Ação:** Análise técnica em andamento

### **🟡 AMARELO - Aguardando Aprovação**
- **Status:** `diagnosis_completed`, `quote_sent`
- **Cor:** `bg-yellow-100 border-yellow-300 text-yellow-800`
- **Significado:** Diagnóstico pronto, aguardando cliente
- **Ação:** Cliente deve aprovar orçamento

### **🟢 VERDE - Em Reparo**
- **Status:** `quote_approved`, `needs_workshop`, `in_repair`
- **Cor:** `bg-green-100 border-green-300 text-green-800`
- **Significado:** Orçamento aprovado, reparo em andamento
- **Ação:** Técnico executando reparo

### **🔷 AZUL ESCURO - Pronto para Entrega**
- **Status:** `ready_for_delivery`, `collected_for_delivery`, `on_the_way_to_deliver`, `payment_pending`
- **Cor:** `bg-indigo-100 border-indigo-300 text-indigo-800`
- **Significado:** Serviço finalizado, aguardando entrega
- **Ação:** Agendar entrega ao cliente

### **✅ VERDE ESCURO - Concluído**
- **Status:** `completed`, `delivered`
- **Cor:** `bg-emerald-100 border-emerald-300 text-emerald-800`
- **Significado:** Serviço totalmente finalizado
- **Ação:** Nenhuma ação necessária

### **🔴 VERMELHO - Cancelado**
- **Status:** `cancelled`, `quote_rejected`, `returned`
- **Cor:** `bg-red-100 border-red-300 text-red-800`
- **Significado:** Serviço cancelado ou rejeitado
- **Ação:** Processar devolução se necessário

### **🟡 AMARELO CLARO - Sugerido**
- **Status:** Status não mapeado ou sugestões da IA
- **Cor:** `bg-amber-100 border-amber-300 text-amber-800`
- **Significado:** Sugestão do sistema ou status desconhecido
- **Ação:** Verificar e confirmar status

## 🎯 **BENEFÍCIOS DO SISTEMA**

### **👁️ Identificação Visual Rápida**
- Técnicos identificam imediatamente a etapa do processo
- Cores intuitivas seguem o fluxo natural do trabalho
- Diferenciação clara entre etapas similares

### **📊 Organização por Prioridade**
- Cores quentes (vermelho, laranja) = Ação urgente
- Cores frias (azul, ciano) = Processo normal
- Verde = Progresso positivo

### **🔄 Fluxo de Trabalho Otimizado**
- Sequência lógica de cores
- Facilita planejamento de rotas
- Melhora gestão de tempo

## 🛠️ **IMPLEMENTAÇÃO TÉCNICA**

### **Arquivos Modificados:**
- `src/hooks/calendar/useMainCalendar.ts` - Mapeamento de status
- `src/components/calendar/MainCalendarView.tsx` - Cores principais
- `src/components/calendar/DragDropCalendar.tsx` - Drag & drop
- `src/components/calendar/ListView.tsx` - Visualização lista
- `src/components/calendar/MonthView.tsx` - Visualização mensal
- `src/hooks/calendar/useCalendarFormatting.ts` - Formatação e badges
- `src/types/calendar.ts` - Tipos TypeScript

### **Consistência:**
- Todas as visualizações usam as mesmas cores
- Badges e tooltips alinhados
- Responsividade mantida

## 📱 **COMPATIBILIDADE**

- ✅ Desktop e mobile
- ✅ Todas as visualizações (dia, semana, mês, lista)
- ✅ Drag and drop preservado
- ✅ Acessibilidade mantida

## 🔮 **PRÓXIMOS PASSOS**

1. **Testes de Usabilidade** - Validar com técnicos
2. **Legendas Visuais** - Adicionar legenda no calendário
3. **Filtros por Cor** - Permitir filtrar por status
4. **Notificações** - Alertas baseados em cores
5. **Relatórios** - Dashboards com métricas por status

---

**Última atualização:** 26/07/2025  
**Versão:** 3.1.0  
**Responsável:** Sistema Fix Fogões
