# Sistema Financeiro - Documentação Técnica

## Visão Geral

O sistema financeiro do Fix Fogões foi projetado para gerenciar todos os aspectos financeiros das ordens de serviço, incluindo pagamentos, transações, alertas e relatórios de inconsistências.

## Arquitetura

### Tabelas Principais

#### `service_orders`
- **Campos financeiros:**
  - `initial_cost`: Valor inicial (sinal para coleta diagnóstico)
  - `final_cost`: Valor final total do serviço
  - `payment_status`: Status do pagamento ('pending', 'advance_paid', 'partial', 'completed', 'overdue')

#### `financial_transactions`
- **Propósito:** Registrar todas as transações financeiras
- **Campos principais:**
  - `service_order_id`: Referência à ordem de serviço
  - `type`: Tipo ('income', 'expense')
  - `amount`: Valor da transação
  - `paid_status`: Status ('paid', 'pending', 'overdue')

#### `payments`
- **Propósito:** Registrar pagamentos específicos por etapa
- **Campos principais:**
  - `service_order_id`: Referência à ordem de serviço
  - `amount`: Valor original
  - `discount_amount`: Valor do desconto
  - `final_amount`: Valor final pago
  - `payment_stage`: Etapa ('collection', 'delivery', 'full')

#### `equipment_diagnostics`
- **Campo financeiro:**
  - `estimated_cost`: Custo estimado do reparo

## Componentes Principais

### 1. Utilitários Financeiros (`src/utils/financialCalculations.ts`)

#### `calculateFinancialSummary(order: ServiceOrder): FinancialSummary`
Calcula resumo financeiro completo de uma ordem de serviço.

**Retorna:**
```typescript
interface FinancialSummary {
  advancePayment: number;      // Valor do sinal pago
  diagnosticEstimate: number;  // Estimativa do diagnóstico
  totalAmount: number;         // Valor total final
  pendingAmount: number;       // Valor pendente
  paymentStatus: string;       // Status do pagamento
  statusDescription: string;   // Descrição do status
  isOverdue: boolean;         // Se está em atraso
  daysOverdue: number;        // Dias em atraso
}
```

#### `validateFinancialConsistency(orders: ServiceOrder[]): ValidationResult[]`
Valida consistência dos dados financeiros entre tabelas.

#### `formatCurrency(value: number): string`
Formata valores monetários para exibição em Real brasileiro.

### 2. Serviço de Alertas (`src/services/financialAlertService.ts`)

#### `FinancialAlertService.analyzeOrders(orders: ServiceOrder[]): FinancialAlert[]`
Analisa ordens de serviço e gera alertas financeiros.

**Tipos de alertas:**
- **Pagamento em atraso:** Ordens com pagamento pendente há mais de 7 dias
- **Valor inconsistente:** Discrepâncias entre valores calculados e registrados
- **Status inválido:** Status de pagamento não condizente com os dados

#### `FinancialAlertService.processCriticalAlerts(): Promise<void>`
Processa alertas críticos e cria notificações no sistema.

### 3. Serviço de Sincronização (`src/services/financialSyncService.ts`)

#### `FinancialSyncService.syncPaymentStatus(serviceOrderId?: string): Promise<SyncResult>`
Sincroniza status de pagamento baseado nos valores financeiros.

#### `FinancialSyncService.fullSync(): Promise<SyncResult>`
Executa sincronização completa de todas as tabelas financeiras.

#### `FinancialSyncService.validateConsistency(): Promise<ValidationResult>`
Valida consistência entre todas as tabelas financeiras.

### 4. Hooks

#### `useFinancialAlerts()`
Hook para gerenciar alertas financeiros.

**Retorna:**
- `alerts`: Lista de alertas
- `unreadAlerts`: Alertas não lidos
- `criticalAlerts`: Alertas críticos
- `markAsRead()`: Marcar alerta como lido
- `clearAlerts()`: Limpar todos os alertas

#### `useFinancialSync()`
Hook para gerenciar sincronização financeira.

**Retorna:**
- `syncAll()`: Sincronizar tudo
- `syncOrder()`: Sincronizar ordem específica
- `validateConsistency()`: Validar consistência
- `isSyncing`: Estado da sincronização

### 5. Componentes de Interface

#### `FinancialAlertsWidget`
Widget para exibir alertas financeiros no dashboard.

**Props:**
- `maxHeight`: Altura máxima do widget
- `showActions`: Mostrar botões de ação
- `compact`: Modo compacto

#### `FinancialSyncWidget`
Widget para controlar sincronização financeira.

#### `FinancialInconsistencyReport`
Relatório detalhado de inconsistências financeiras.

## Fluxo de Dados

### 1. Criação de Ordem de Serviço
1. Ordem criada com `initial_cost` (se aplicável)
2. `payment_status` definido como 'pending'
3. Transação financeira criada automaticamente

### 2. Diagnóstico
1. Técnico registra `estimated_cost` em `equipment_diagnostics`
2. Sistema atualiza cálculos financeiros
3. Alertas são gerados se necessário

### 3. Pagamento
1. Pagamento registrado em `payments`
2. `payment_status` atualizado automaticamente
3. Transação financeira criada
4. Sincronização executada

### 4. Monitoramento
1. Sistema analisa ordens periodicamente
2. Alertas gerados para problemas
3. Notificações criadas para alertas críticos
4. Relatórios de inconsistência disponíveis

## Status de Pagamento

### Estados Válidos
- **pending**: Pagamento pendente
- **advance_paid**: Sinal pago (coleta diagnóstico)
- **partial**: Pagamento parcial
- **completed**: Pagamento completo
- **overdue**: Pagamento em atraso

### Regras de Transição
1. **pending → advance_paid**: Quando sinal é pago
2. **advance_paid → partial**: Quando pagamento adicional é feito
3. **partial → completed**: Quando pagamento total é concluído
4. **completed → overdue**: Quando prazo é ultrapassado (7 dias)

## Validações

### Consistência de Dados
1. **Valor total**: `final_cost` deve ser >= `initial_cost`
2. **Status vs Valores**: Status deve condizer com valores pagos
3. **Referências**: Todas as transações devem ter ordem válida
4. **Datas**: Datas de pagamento devem ser lógicas

### Alertas Automáticos
1. **Atraso**: Pagamentos pendentes há mais de 7 dias
2. **Inconsistência**: Valores não batem entre tabelas
3. **Status inválido**: Status não condiz com dados

## Configuração

### Variáveis de Ambiente
```env
VITE_API_URL=http://localhost:3001  # API externa (opcional)
```

### Configurações do Sistema
- **Prazo para atraso**: 7 dias após conclusão
- **Moeda**: Real brasileiro (BRL)
- **Precisão**: 2 casas decimais

## Troubleshooting

### Problemas Comuns

#### 1. Status de pagamento inconsistente
**Solução:** Execute sincronização financeira
```typescript
const { syncAll } = useFinancialSync();
await syncAll();
```

#### 2. Alertas não aparecem
**Verificar:**
- Dados das ordens estão carregados
- Hook `useFinancialAlerts` está sendo usado
- Componente `FinancialAlertsWidget` está renderizado

#### 3. Valores incorretos
**Verificar:**
- Função `calculateFinancialSummary` está sendo usada
- Dados das tabelas relacionadas estão sincronizados
- Validação de consistência foi executada

### Logs de Debug
```typescript
// Habilitar logs detalhados
console.log('Financial Summary:', calculateFinancialSummary(order));
console.log('Validation Result:', validateFinancialConsistency([order]));
```

## Roadmap

### Próximas Funcionalidades
1. **Relatórios avançados**: Gráficos de receita por período
2. **Integração bancária**: Conciliação automática
3. **Previsões**: Análise preditiva de recebimentos
4. **Automação**: Cobrança automática de atrasos

### Melhorias Planejadas
1. **Performance**: Cache de cálculos financeiros
2. **Usabilidade**: Interface mais intuitiva
3. **Segurança**: Auditoria de transações
4. **Escalabilidade**: Otimização para grandes volumes
