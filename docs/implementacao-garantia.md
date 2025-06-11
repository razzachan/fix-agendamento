# Implementação de Suporte a Garantia

## Contexto

O sistema EletroFix Hub Pro atualmente não possui suporte para gerenciamento de garantia nas ordens de serviço. Esta funcionalidade é essencial para o negócio de assistência técnica, pois permite:

1. Rastrear quais serviços estão em período de garantia
2. Identificar quando uma nova ordem está relacionada a um serviço anterior em garantia
3. Aplicar políticas de negócio específicas para serviços em garantia
4. Melhorar a experiência do cliente e a transparência do processo

## Requisitos

### Requisitos Funcionais

1. **Registro de Garantia**:
   - Definir período de garantia padrão (3 meses)
   - Permitir personalização do período de garantia por ordem de serviço
   - Calcular automaticamente a data de término da garantia

2. **Visualização de Status de Garantia**:
   - Exibir informações de garantia na página de detalhes da ordem
   - Indicar visualmente se uma ordem está em garantia
   - Mostrar tempo restante de garantia

3. **Gestão de Ordens em Garantia**:
   - Identificar automaticamente se uma nova ordem está relacionada a um serviço em garantia
   - Aplicar regras de negócio específicas para serviços em garantia (ex: não cobrar)
   - Registrar histórico de atendimentos em garantia

4. **Notificações de Garantia**:
   - Alertar sobre garantias próximas do vencimento
   - Notificar clientes sobre o término da garantia

### Requisitos Não-Funcionais

1. **Usabilidade**:
   - Interface intuitiva para gerenciamento de garantia
   - Indicadores visuais claros para status de garantia

2. **Desempenho**:
   - Cálculos de garantia não devem impactar o desempenho do sistema

3. **Manutenibilidade**:
   - Código modular e bem documentado
   - Testes automatizados para funcionalidades de garantia

## Modelo de Dados

### Alterações na Tabela `service_orders`

Adicionar os seguintes campos:

```sql
ALTER TABLE service_orders
ADD COLUMN warranty_period INTEGER DEFAULT 3,
ADD COLUMN warranty_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN warranty_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN warranty_terms TEXT,
ADD COLUMN related_warranty_order_id UUID REFERENCES service_orders(id);
```

### Nova Tabela `warranty_services`

Criar uma tabela para rastrear serviços realizados em garantia:

```sql
CREATE TABLE IF NOT EXISTS warranty_services (
  id UUID PRIMARY KEY,
  original_order_id UUID NOT NULL REFERENCES service_orders(id),
  warranty_order_id UUID NOT NULL REFERENCES service_orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  
  CONSTRAINT fk_original_order FOREIGN KEY (original_order_id) REFERENCES service_orders(id),
  CONSTRAINT fk_warranty_order FOREIGN KEY (warranty_order_id) REFERENCES service_orders(id)
);
```

## Componentes de Interface

1. **Seção de Garantia no Formulário de Ordem de Serviço**:
   - Campo para definir período de garantia
   - Campo para termos de garantia
   - Opção para relacionar com ordem anterior (caso seja um atendimento em garantia)

2. **Visualização de Garantia na Página de Detalhes**:
   - Badge indicando status de garantia
   - Informações sobre período e data de término
   - Histórico de atendimentos em garantia relacionados

3. **Filtro de Garantia na Lista de Ordens**:
   - Opção para filtrar ordens em garantia
   - Opção para filtrar ordens com garantia próxima do vencimento

## Serviços e Lógica de Negócios

1. **Serviço de Garantia**:
   - Cálculo de datas de garantia
   - Verificação de status de garantia
   - Relacionamento entre ordens originais e ordens em garantia

2. **Regras de Negócio**:
   - Definir condições para aplicação de garantia
   - Automatizar processo de criação de ordens em garantia
   - Definir políticas de cobrança para serviços em garantia

## Plano de Implementação

### Fase 1: Modelo de Dados e Backend

1. Atualizar o modelo de dados no TypeScript
2. Criar as migrações de banco de dados
3. Implementar serviços de backend para gestão de garantia

### Fase 2: Interface de Usuário

1. Atualizar formulário de criação/edição de ordens
2. Implementar visualização de garantia na página de detalhes
3. Adicionar filtros de garantia na lista de ordens

### Fase 3: Lógica de Negócios

1. Implementar verificação automática de garantia
2. Desenvolver fluxo para criação de ordens em garantia
3. Configurar regras de cobrança para serviços em garantia

### Fase 4: Notificações e Relatórios

1. Implementar alertas para garantias próximas do vencimento
2. Criar relatórios de serviços em garantia
3. Configurar notificações para clientes

## Priorização

Esta implementação será realizada antes das seguintes funcionalidades pendentes:
- Registro de materiais utilizados
- Registro de horas trabalhadas
- Anexo de fotos e documentos
- Assinatura digital do cliente

A decisão de priorizar o suporte a garantia se baseia na importância desta funcionalidade para o negócio e seu impacto direto na experiência do cliente e na gestão financeira.

## Estimativa de Tempo

- **Fase 1**: 1-2 dias
- **Fase 2**: 2-3 dias
- **Fase 3**: 2-3 dias
- **Fase 4**: 1-2 dias

**Total estimado**: 6-10 dias de desenvolvimento
