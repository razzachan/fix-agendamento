# Documentação: Módulo de Pré-Agendamentos

## Visão Geral

O módulo de Pré-Agendamentos é responsável por gerenciar as solicitações iniciais de serviço feitas pelos clientes. Estas solicitações ainda não têm horários e datas confirmados e precisam ser processadas ao final do expediente para organizar rotas e confirmar horários com os clientes.

## Funcionalidades Implementadas

### 1. Renomeação da Seção
- Alterado o nome da seção de "Agendamentos" para "Pré-Agendamentos" para maior clareza
- Atualizado o título do card para "Solicitações de Serviço"
- Atualizada a descrição para refletir melhor o propósito da seção

### 2. Filtros Avançados
- **Filtro por Data**: Permite filtrar solicitações por data específica
- **Filtro por Técnico**: Permite filtrar solicitações por técnico designado
- **Filtro por Status**: Permite filtrar por status (pendente, confirmado, reagendado, cancelado, roteirizado)
- **Filtro por Urgência**: Permite filtrar solicitações urgentes ou normais
- **Busca por Texto**: Permite buscar em vários campos (nome do cliente, endereço, equipamento, problema, telefone, técnico)

### 3. Visualização de Detalhes
- Exibição de informações detalhadas de cada solicitação
- Indicadores visuais para solicitações urgentes
- Botões de ação para confirmar, reagendar ou cancelar solicitações

### 4. Visualização de Mapa para Roteirização
- Alternância entre visualização de tabela e mapa
- Exibição de marcadores no mapa para visualizar a distribuição geográfica das solicitações
- Marcadores diferenciados para solicitações urgentes (vermelho) e normais (azul)
- Popups com detalhes da solicitação ao clicar no marcador
- Botão para obter direções via Google Maps
- Base para o assistente de IA gerar roteiros otimizados
- Auxílio visual para designação eficiente de técnicos com base na localização

## Arquitetura do Módulo

### Componentes Principais
- **src/pages/Schedules.tsx**: Componente principal da página de pré-agendamentos
- **src/components/schedules/SchedulesFilters.tsx**: Componente de filtros
- **src/components/schedules/AgendamentosTable.tsx**: Componente de tabela de pré-agendamentos
- **src/components/schedules/SchedulesMap.tsx**: Componente de visualização de mapa

### Hooks
- **src/hooks/schedules/useSchedulesLogic.ts**: Hook principal com a lógica da página
- **src/hooks/schedules/useSchedulesFilters.ts**: Hook para gerenciar a lógica dos filtros

## Fluxo de Dados

1. O usuário acessa a página de pré-agendamentos
2. Os dados são carregados do backend via API
3. Os filtros são aplicados automaticamente conforme o usuário faz seleções
4. O usuário pode confirmar, reagendar ou cancelar solicitações
5. As ações são enviadas ao backend para processamento

## Princípios SOLID Aplicados

### Single Responsibility Principle (SRP)
- Cada componente e hook tem uma responsabilidade única e bem definida
- O hook de filtros gerencia apenas a lógica de filtragem
- O hook principal gerencia a lógica geral da página

### Open/Closed Principle (OCP)
- A estrutura permite adicionar novos filtros sem modificar o código existente
- Novos tipos de ações podem ser adicionados sem alterar a lógica principal

### Liskov Substitution Principle (LSP)
- Os componentes são projetados para serem substituíveis sem afetar o comportamento do sistema

### Interface Segregation Principle (ISP)
- As interfaces são específicas para cada componente
- Não há dependências desnecessárias entre componentes

### Dependency Inversion Principle (DIP)
- Os componentes dependem de abstrações, não de implementações concretas
- A lógica de negócios é separada da interface do usuário

## Próximos Passos (MVP)

1. **Melhorar Funcionalidades Básicas do Mapa**:
   - Aprimorar a visualização geográfica das solicitações
   - Implementar filtros visuais no mapa (por status, técnico, etc.)
   - Adicionar funcionalidade de zoom para regiões específicas

2. **Melhorar Confirmação em Lote**:
   - Adicionar a capacidade de confirmar múltiplas solicitações de uma vez
   - Implementar seleção de solicitações no mapa para processamento em lote
   - Permitir designação de técnicos para múltiplas solicitações

3. **Integração com Módulos Relacionados**:
   - Melhorar a integração com o módulo de calendário para visualização de agendamentos
   - Conectar com o módulo de Ordens de Serviço para acompanhamento do ciclo completo
   - Implementar notificações para técnicos quando designados para novas solicitações

4. **Adaptações para Diferentes Roles**:
   - Administrador: Visão completa e capacidade de gerenciamento de todas as solicitações
   - Técnico: Visualização apenas de suas próprias designações
   - Oficina: Acesso às solicitações relacionadas aos serviços da oficina

## Funcionalidades Futuras (Médio/Longo Prazo)

1. **Assistente de IA para Roteirização**:
   - Integrar com APIs de IA existentes (OpenAI, Google Maps)
   - Implementar sugestões automáticas de roteiros otimizados
   - Permitir ajustes manuais nas rotas geradas automaticamente

2. **Visualizações Avançadas e Analytics**:
   - Implementar dashboard com estatísticas de solicitações por região, técnico, etc.
   - Adicionar visualização de calor (heatmap) para identificar áreas com maior demanda
   - Criar gráficos de desempenho e eficiência por região e técnico

3. **Otimização Avançada de Rotas**:
   - Implementar algoritmos de otimização considerando trânsito em tempo real
   - Calcular janelas de tempo ideais para cada visita
   - Prever duração de serviços com base em histórico

## Auditoria de Código

- Última auditoria: 15/05/2023
- Responsável: Equipe de Desenvolvimento
- Principais melhorias identificadas:
  - Implementação de busca por texto
  - Correção da lógica de busca para incluir todos os campos relevantes
  - Remoção de botão de filtro desnecessário
  - Reorganização do layout para melhor utilização do espaço
  - Implementação de visualização de mapa com OpenStreetMap
  - Adição de marcadores diferenciados para solicitações urgentes
  - Implementação de popups informativos no mapa
  - Adição de botão para obter direções via Google Maps

## Conclusão

O módulo de Pré-Agendamentos foi projetado seguindo os princípios SOLID e as melhores práticas de desenvolvimento. As melhorias implementadas tornam a seção mais clara e funcional, permitindo que os usuários filtrem as solicitações de serviço de forma mais eficiente.

A adição da visualização de mapa representa um avanço significativo na usabilidade do sistema, permitindo uma melhor visualização geográfica das solicitações de serviço. Esta funcionalidade, mesmo em sua versão MVP, já facilita a designação de técnicos com base na localização, resultando em maior eficiência operacional e melhor atendimento ao cliente.

O módulo foi projetado considerando as diferentes roles de usuário (administrador, técnico, oficina), preparando o terreno para implementações futuras que atendam às necessidades específicas de cada tipo de usuário. A abordagem de desenvolvimento em fases (MVP primeiro, funcionalidades avançadas depois) garante entregas de valor contínuas enquanto mantém a visão de longo prazo.

A implementação seguiu rigorosamente as diretrizes do projeto, com foco na documentação, auditoria de código e princípios SOLID, garantindo um código limpo, manutenível e escalável. As bases estabelecidas nesta fase permitirão a adição futura de funcionalidades avançadas, como o assistente de IA para roteirização automática, sem necessidade de refatorações significativas.
