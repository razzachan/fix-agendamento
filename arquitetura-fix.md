# Arquitetura do EletroFix Hub Pro

*Documento de Arquitetura e Roadmap de Implementação*

**Versão:** 1.4
**Data:** 14/05/2025 (Atualizado em 15/05/2025)
**Status:** Em Implementação

## 1. Visão Geral da Arquitetura

O EletroFix Hub Pro é um sistema completo de gestão para manutenção de eletrodomésticos, composto por:

1. **Frontend**: Aplicação React/Vite com interface moderna e responsiva
2. **Backend/Middleware**: Serviço FastAPI para integração entre WhatsApp e Supabase
3. **Banco de Dados**: Supabase (PostgreSQL) para armazenamento de dados
4. **Integrações**: WhatsApp (via Clientechat) para comunicação com clientes

## 2. Estrutura do Frontend (Atualizada)

### Componentes Principais Ativos:
- **Autenticação (auth/)**: Sistema de login com diferentes perfis
- **Dashboard (Dashboard.tsx)**: Visão geral do sistema com métricas
- **Pré-Agendamentos (Schedules.tsx)**: Gestão de agendamentos recebidos via WhatsApp
- **Ordens de Serviço (ServiceOrders.tsx)**: Gerenciamento de ordens de serviço
- **Clientes (Clients.tsx)**: Cadastro e gestão de clientes
- **Técnicos (Technicians.tsx)**: Cadastro e gestão de técnicos
- **Calendário (CalendarView.tsx)**: Visualização de agendamentos e ordens
- **Rastreamento (TechnicianTracking.tsx)**: Acompanhamento de técnicos em campo

### Componentes de Pré-Agendamentos (Atualizados):
- **AgendamentosTable.tsx**: Tabela de visualização de agendamentos
- **AgendamentoItem.tsx**: Item individual de agendamento com botão "Roteirizar" para agendamentos do Clientechat
- **SchedulesFilters.tsx**: Filtros para agendamentos
- **ConfirmationDialog.tsx**: Diálogo de confirmação de ações
- **RoutingDialog.tsx**: Diálogo para roteirização de agendamentos
- **CreateServiceOrderDialog.tsx**: Diálogo para criação de ordens de serviço a partir de agendamentos

### Componentes de Ordens de Serviço (Atualizados):
- **OrdersTable.tsx**: Tabela de visualização de ordens de serviço
- **OrdersTableRow.tsx**: Linha da tabela com informações detalhadas do cliente (CPF, email, telefone)
- **OrderDetails/index.tsx**: Visualização detalhada da ordem de serviço
- **OrderClientInfo.tsx**: Informações do cliente com CPF, email e telefone
- **OrderServiceInfo.tsx**: Informações do serviço com link para Google Maps
- **OrderEquipmentInfo.tsx**: Informações do equipamento com tipo de atendimento
- **OrderHeader.tsx**: Cabeçalho da ordem de serviço com informações resumidas
- **OrderActions.tsx**: Ações da ordem de serviço (imprimir, enviar por WhatsApp, excluir)

### Hooks Principais (Atualizados):
- **useAppData.ts**: Hook central para acesso a dados da aplicação
- **useAgendamentosData.ts**: Hook para gerenciamento de agendamentos
- **useSchedulesLogic.ts**: Lógica de negócio para agendamentos
- **useConfirmationDialog.ts**: Hook para gerenciamento do diálogo de confirmação e criação de ordens de serviço
- **useServiceOrdersData.ts**: Hook para gerenciamento de ordens de serviço
- **useTechniciansData.ts**: Hook para gerenciamento de técnicos
- **useClientsData.ts**: Hook para gerenciamento de clientes

### Integração com Supabase:
- **client.ts**: Cliente Supabase configurado com URL e chave
- **types.ts**: Definições de tipos para o banco de dados Supabase

### Organização do Código:
- **components/**: Componentes reutilizáveis organizados por funcionalidade
- **pages/**: Páginas principais da aplicação
- **hooks/**: Hooks personalizados para lógica de negócio
- **services/**: Serviços para comunicação com APIs
- **contexts/**: Contextos para gerenciamento de estado global
- **utils/**: Funções utilitárias
- **types/**: Definições de tipos TypeScript
- **integrations/**: Integrações com serviços externos (Supabase)

## 3. Estrutura do Backend/Middleware

### Componentes Principais:
- **API REST**: Endpoints para comunicação com o frontend
- **Integração WhatsApp**: Recebimento e processamento de mensagens do WhatsApp
- **Integração Supabase**: Armazenamento e recuperação de dados

### Middleware Existente (Fix Fogões):
- **main.py**: Ponto de entrada da aplicação com endpoints FastAPI
  - `/agendamento-inteligente`: Endpoint principal para receber dados do WhatsApp
  - `/health`: Verificação de saúde da API
  - `/api/agendamentos`: Endpoint para listar agendamentos
- **supabase_client.py**: Cliente para comunicação com o Supabase
  - `get_supabase_client()`: Inicializa e retorna o cliente Supabase
  - `inserir_agendamento()`: Insere um novo agendamento na tabela agendamentos_ai

### Fluxo de Integração WhatsApp-Supabase:
1. Clientechat envia dados do agendamento para o endpoint `/agendamento-inteligente`
2. Middleware processa os dados e valida campos obrigatórios
3. Middleware determina o técnico com base no tipo de equipamento
4. Middleware insere o agendamento no Supabase com status "pendente"
5. Frontend exibe o agendamento na lista de agendamentos pendentes

### Organização do Código Backend (Proposta):
- **main.py**: Ponto de entrada da aplicação
- **supabase_client.py**: Cliente para comunicação com o Supabase
- **routes/**: Rotas da API organizadas por funcionalidade
- **models/**: Modelos de dados
- **services/**: Serviços para lógica de negócio
- **utils/**: Funções utilitárias

## 4. Modelo de Dados (Atualizado)

### Entidades Ativas:
- **Usuários (users)**: Sistema de autenticação e perfis de usuário
- **Perfis (profiles)**: Informações adicionais dos usuários
- **Agendamentos (agendamentos_ai)**: Solicitações recebidas via WhatsApp
  - Campos atualizados: id, nome, endereco, equipamento, problema, urgente, status, tecnico, created_at, cpf, email, telefone, origem, equipamentos, problemas
  - Status adicionado: "os_criada" para agendamentos que tiveram ordens de serviço criadas
  - Suporte para múltiplos equipamentos e problemas armazenados como JSONB
- **Ordens de Serviço (service_orders)**: Gerenciamento de serviços
  - Campos atualizados: id, client_id, client_name, technician_id, technician_name, status, description, equipment_type, equipment_model, equipment_serial, needs_pickup, pickup_address, pickup_city, pickup_state, pickup_zip_code, current_location, service_attendance_type, client_email, client_phone, client_cpf_cnpj, created_at, scheduled_date, completed_date
  - Tipos de serviço: coleta_diagnostico, coleta_conserto, em_domicilio
- **Clientes (clients)**: Cadastro de clientes
  - Campos principais: id, name, email, phone, cpf_cnpj, address, city, state, zip_code, address_complement, address_reference, user_id
- **Técnicos (technicians)**: Cadastro de técnicos
  - Campos principais: id, name, email, phone, specialties, location, user_id
- **Serviços Agendados (scheduled_services)**: Agendamentos de serviços
  - Campos principais: id, service_order_id, technician_id, client_id, scheduled_start_time, scheduled_end_time, address, status
- **Imagens de Ordens de Serviço (service_order_images)**: Armazenamento de imagens

### Entidades Planejadas (A Implementar):
- **Eventos de Serviço (service_events)**: Histórico de eventos das ordens de serviço
  - Campos principais: id, service_order_id, type, description, created_at, created_by
- **Diagnósticos de Equipamentos (equipment_diagnostics)**: Diagnósticos técnicos
  - Campos principais: id, service_order_id, workshop_user_id, diagnosis_details, recommended_service, estimated_cost
- **Transações Financeiras (financial_transactions)**: Controle financeiro
  - Campos principais: id, service_order_id, type, amount, description, category, date, paid_status
- **Notificações (notifications)**: Sistema de notificações
  - Campos principais: id, user_id, title, description, time, read, type

## 5. Fluxos de Negócio (Atualizados)

### Fluxo de Pré-Agendamento (Clientechat):
1. Cliente solicita serviço via WhatsApp através do Clientechat
2. Middleware processa a mensagem e armazena no Supabase com origem "clientechat"
3. Administrador visualiza o agendamento no frontend na seção de pré-agendamentos
4. Administrador roteiriza diretamente o agendamento (sem necessidade de confirmação)
5. Administrador cria ordem de serviço a partir do agendamento roteirizado
6. Agendamento é atualizado para status "os_criada" e mostra botão "Ver OS"

### Fluxo de Pré-Agendamento (Outras Origens):
1. Cliente solicita serviço via outros canais
2. Administrador registra o agendamento manualmente
3. Administrador confirma, reagenda ou cancela o agendamento
4. Após confirmação, o administrador roteiriza o agendamento
5. Administrador cria ordem de serviço a partir do agendamento roteirizado
6. Agendamento é atualizado para status "os_criada" e mostra botão "Ver OS"

### Fluxo de Ordem de Serviço (Atualizado):
1. Ordem de serviço é criada a partir de um agendamento roteirizado
2. O sistema extrai automaticamente:
   - Informações do cliente (CPF, email, telefone)
   - Cidade, estado e CEP do endereço
   - Modelo do equipamento a partir da descrição
   - Tipo de atendimento com base no equipamento e problema
   - Múltiplos equipamentos e problemas (se existirem)
3. Para cada equipamento, o sistema:
   - Determina o tipo de atendimento específico (em_domicilio, coleta_conserto, coleta_diagnostico)
   - Extrai o modelo (se disponível)
   - Cria um item de serviço na ordem
4. O sistema determina o tipo de atendimento principal da ordem:
   - Se todos os equipamentos forem atendimento em domicílio, a ordem é em_domicilio
   - Se pelo menos um equipamento for coleta para diagnóstico, a ordem é coleta_diagnostico
   - Se pelo menos um equipamento for coleta para conserto (e nenhum for diagnóstico), a ordem é coleta_conserto
5. Administrador visualiza os detalhes completos da ordem de serviço, incluindo todos os equipamentos
6. Administrador pode imprimir a ordem de serviço ou enviá-la por WhatsApp (com detalhes de todos os equipamentos)
7. Administrador atribui técnico e/ou oficina
8. Técnico executa o serviço e atualiza o status
9. Administrador finaliza a ordem e processa o pagamento

### Tipos de Serviço:
1. **Coleta/Diagnóstico**:
   - Custo: R$350 por equipamento
   - 100% de desconto se o reparo for aprovado
   - Prazo: 7 dias úteis

2. **Coleta/Reparo**:
   - Pagamento: 50% na coleta, 50% na entrega
   - Garantia: 3 meses
   - Prazo: 7 dias úteis

3. **Serviço no Local**:
   - Pagamento: Conforme acordado
   - Garantia: 3 meses
   - Prazo: Serviço realizado na hora, durante a visita técnica

## 6. Otimizações e Boas Práticas

### Frontend:
- **Componentização**: Componentes pequenos e reutilizáveis
- **Memoização**: Uso de React.memo, useMemo e useCallback para evitar renderizações desnecessárias
- **Code Splitting**: Carregamento sob demanda de componentes
- **Virtualização**: Para listas longas (ordens de serviço, clientes)
- **Prefetching**: Carregamento antecipado de dados prováveis
- **Caching**: Armazenamento em cache de dados frequentemente acessados

### Backend:
- **Assincronicidade**: Uso de operações assíncronas para melhor performance
- **Validação**: Validação rigorosa de dados de entrada
- **Logging**: Sistema de logs detalhado para depuração
- **Rate Limiting**: Limitação de requisições para evitar sobrecarga
- **Caching**: Cache de respostas frequentes

### Banco de Dados:
- **Índices**: Índices apropriados para consultas frequentes
- **Políticas RLS**: Políticas de segurança em nível de linha para controle de acesso
- **Normalização**: Estrutura de dados normalizada para evitar redundância
- **Triggers**: Para manter integridade e consistência dos dados

## 7. Segurança

- **Autenticação**: Sistema robusto de autenticação com JWT
- **Autorização**: Controle de acesso baseado em perfis
- **Criptografia**: Dados sensíveis criptografados
- **Validação**: Validação de entrada para prevenir injeções
- **CORS**: Configuração adequada para prevenir ataques cross-origin
- **Rate Limiting**: Proteção contra ataques de força bruta

## 8. Escalabilidade

- **Arquitetura Modular**: Facilita adição de novos recursos
- **API Versionada**: Permite evolução sem quebrar compatibilidade
- **Containerização**: Facilita implantação e escalabilidade horizontal
- **Monitoramento**: Sistema de monitoramento para identificar gargalos

## 9. Implementações Práticas e Inovadoras (Roadmap de Desenvolvimento)

### Fase 1: Fundação (1-2 meses)
*Considerando 4-6 horas/dia, 5 dias/semana*

1. **Aprimoramento dos Componentes Existentes**:
   - Melhoria da integração WhatsApp-Supabase já implementada
     - Adicionar campo para data_agendada na tabela agendamentos_ai
     - Implementar validação mais robusta dos dados recebidos
     - Melhorar o tratamento de erros e logging
   - Refinamento da interface de agendamentos atual
     - Adicionar visualização em mapa dos endereços
     - Implementar filtros mais avançados
     - Melhorar a exibição de agendamentos urgentes
   - Otimização do fluxo de login de usuários
     - Implementar recuperação de senha
     - Melhorar a segurança com autenticação de dois fatores
   - Correção de bugs e problemas identificados na auditoria

2. **Assistente de IA para Tomada de Decisão**:
   - Implementação de dashboard analítico com métricas-chave
     - Taxa de conversão de agendamentos para ordens de serviço
     - Tempo médio de atendimento por tipo de serviço
     - Distribuição geográfica dos agendamentos
   - Assistente básico para análise de tendências e padrões
     - Previsão de demanda por região
     - Identificação de padrões sazonais
   - Recomendações para otimização de rotas e alocação de técnicos
     - Sugestão de técnicos com base na proximidade e especialidade
     - Otimização de rotas para múltiplos atendimentos
   - Alertas inteligentes para oportunidades de negócio
     - Identificação de clientes recorrentes
     - Sugestão de serviços complementares

3. **Fluxo Completo de Ordens de Serviço**:
   - Implementação da conversão de agendamentos para ordens de serviço
     - Interface para converter agendamento em ordem de serviço
     - Seleção do tipo de serviço (coleta_diagnostico, coleta_reparo, servico_local)
   - Aprimoramento da interface de ordens de serviço
     - Visualização detalhada do histórico de eventos
     - Upload e visualização de imagens do equipamento
   - Implementação do fluxo completo de status
     - Pendente → Confirmado → Em Andamento → Na Oficina → Diagnóstico → Aprovação → Reparo → Concluído
   - Integração com sistema de notificações
     - Notificações para clientes sobre mudanças de status
     - Alertas para técnicos sobre novas atribuições

### Fase 2: Consolidação (3-4 meses)
*Considerando 4-6 horas/dia, 5 dias/semana*

4. **Sistema de Orçamentos Inicial**:
   - Modelos básicos de orçamentos por tipo de equipamento
   - Cálculo manual de valores com sugestões automáticas
   - Geração de PDF simples com detalhamento
   - Armazenamento de histórico de orçamentos

5. **Gestão de Garantia e Pagamentos**:
   - Registro do período de garantia de 3 meses
   - Controle básico de pagamentos parciais (50/50)
   - Geração de links de pagamento via WhatsApp
   - Suporte inicial a PIX e outros métodos

6. **Aprimoramento da Área do Cliente**:
   - Melhorias na interface de login existente
   - Histórico básico de serviços e pagamentos
   - Acompanhamento simplificado de status
   - Formulário para solicitação de novos serviços

### Fase 3: Otimização (5-6 meses)
*Considerando 4-6 horas/dia, 5 dias/semana*

6. **Gestão Básica de Estoque**:
   - Cadastro das peças mais utilizadas
   - Alertas simples de estoque baixo
   - Vinculação manual de peças às ordens de serviço
   - Relatórios básicos de consumo

7. **Roteirização de Técnicos**:
   - Visualização simples em mapa
   - Agrupamento manual por região
   - Registro de chegada e saída
   - Notificações básicas ao cliente

### Fase 4: Expansão (7-9 meses)
*Considerando 4-6 horas/dia, 5 dias/semana*

8. **Dashboard de Produtividade**:
   - Métricas por técnico e tipo de serviço
   - Análise de tempo médio de atendimento
   - Acompanhamento de taxa de conversão
   - Identificação de gargalos operacionais

9. **Sistema de Feedback**:
   - Pesquisas de satisfação via WhatsApp
   - Sistema simples de avaliação de técnicos
   - Registro de problemas recorrentes
   - Análise manual de feedbacks

### Fase 5: Evolução (10-12 meses)
*Considerando 4-6 horas/dia, 5 dias/semana*

10. **Programa de Fidelidade Básico**:
    - Identificação de clientes recorrentes
    - Descontos manuais para clientes frequentes
    - Sistema simples de indicação
    - Campanhas básicas de manutenção preventiva

11. **Base de Conhecimento Inicial**:
    - Documentação de soluções comuns
    - Organização básica por marca/modelo
    - Tutoriais simples para diagnóstico
    - Compartilhamento interno de boas práticas

12. **Expansão Inicial do Negócio**:
    - Catálogo básico de peças para venda
    - Oferta manual de planos de manutenção
    - Contatos iniciais com fabricantes
    - Material básico para treinamentos

## 10. Componentes Implementados e Status Atual

### Componentes Implementados:

1. **Integração WhatsApp-Supabase**:
   - Middleware para receber dados do Clientechat
   - Armazenamento de agendamentos no Supabase
   - Processamento de campos como CPF, email, telefone, endereço, problema e equipamento

2. **Módulo de Pré-Agendamentos**:
   - Visualização de agendamentos recebidos via WhatsApp
   - Filtros por status, urgência, técnico e data
   - Ações de confirmação, reagendamento e cancelamento
   - Roteirização direta para agendamentos do Clientechat
   - Criação de ordens de serviço a partir de agendamentos

3. **Módulo de Ordens de Serviço**:
   - Visualização detalhada de ordens de serviço
   - Exibição de informações completas do cliente (CPF, email, telefone)
   - Exibição de informações do equipamento e problema
   - Visualização de endereço com link para Google Maps
   - Ações de impressão, envio por WhatsApp e exclusão
   - Extração inteligente de cidade, estado e CEP do endereço
   - Extração inteligente de modelo do equipamento
   - Determinação automática do tipo de atendimento com base no equipamento e problema
   - Suporte para múltiplos equipamentos por ordem de serviço
   - Visualização detalhada de cada equipamento com seu respectivo problema e tipo de atendimento
   - Mensagens de WhatsApp formatadas para múltiplos equipamentos

4. **Fluxo Otimizado Clientechat → Ordem de Serviço**:
   - Identificação de origem dos agendamentos (Clientechat)
   - Botão "Roteirizar" direto para agendamentos do Clientechat
   - Criação de ordem de serviço a partir de agendamento roteirizado
   - Atualização de status do agendamento para "OS Criada"
   - Botão "Ver OS" para acessar a ordem de serviço criada

### Componentes Removidos:

1. **Componentes Mapbox**:
   - `MapboxTokenConfig.tsx`
   - `useMapboxToken.ts`
   - Substituídos por soluções baseadas em Street Maps

2. **Componentes de Workshop**:
   - Diversos componentes relacionados a oficinas
   - Serão reimplementados quando o módulo de oficinas for desenvolvido

3. **Componentes de Diagnóstico**:
   - Componentes relacionados ao diagnóstico técnico
   - Serão reimplementados quando o módulo de diagnóstico for desenvolvido

4. **Componentes Financeiros**:
   - `useFinancialData.ts`
   - `useFinancialTransactions.ts`
   - `financialTransactionService.ts`
   - `Finance.tsx`
   - Serão reimplementados quando o módulo financeiro for desenvolvido

### Próximos Passos:

1. **Implementação do Módulo de Técnicos**:
   - Cadastro e gestão de técnicos
   - Atribuição de técnicos a ordens de serviço
   - Visualização de ordens de serviço por técnico

2. **Implementação do Módulo de Oficinas**:
   - Cadastro e gestão de oficinas
   - Atribuição de ordens de serviço a oficinas
   - Acompanhamento de status de equipamentos na oficina

3. **Implementação do Módulo Financeiro**:
   - Registro de pagamentos
   - Controle de pagamentos parciais (50/50)
   - Geração de relatórios financeiros

## 11. Plano de Implementação Inicial (Primeiras 4 Semanas)

### Semana 1: Aprimoramento da Integração WhatsApp-Supabase
*Considerando 4-6 horas/dia, 5 dias/semana*

1. **Aprimoramento do Middleware** (3 dias):
   - Adicionar campo data_agendada na tabela agendamentos_ai
   - Implementar validação mais robusta dos dados recebidos
   - Melhorar o tratamento de erros e logging
   - Adicionar endpoint para atualização de status via WhatsApp

2. **Melhoria da Interface de Agendamentos** (2 dias):
   - Implementar visualização em mapa dos endereços
   - Adicionar filtros avançados (por região, urgência, técnico)
   - Melhorar a exibição de agendamentos urgentes
   - Implementar ordenação por diferentes critérios

### Semana 2: Assistente de IA e Dashboard Analítico
*Considerando 4-6 horas/dia, 5 dias/semana*

3. **Implementação do Dashboard Analítico** (3 dias):
   - Criação de visualizações para métricas-chave:
     - Taxa de conversão de agendamentos para ordens
     - Tempo médio de atendimento por tipo de serviço
     - Distribuição geográfica dos agendamentos
   - Implementação de filtros por período e região
   - Integração com dados existentes no Supabase

4. **Assistente de IA para Decisões** (2 dias):
   - Implementação de análises de tendências:
     - Previsão de demanda por região
     - Identificação de padrões sazonais
   - Alertas para oportunidades de negócio:
     - Identificação de clientes recorrentes
     - Sugestão de serviços complementares

### Semana 3: Conversão de Agendamentos para Ordens de Serviço
*Considerando 4-6 horas/dia, 5 dias/semana*

5. **Interface de Conversão** (3 dias):
   - Implementar botão "Converter para Ordem de Serviço" na interface de agendamentos
   - Criar formulário para seleção do tipo de serviço (coleta_diagnostico, coleta_reparo, servico_local)
   - Implementar transferência de dados do agendamento para a ordem de serviço
   - Adicionar campo para informações adicionais e observações

6. **Fluxo de Status de Ordens** (2 dias):
   - Implementar estados e transições para o fluxo completo:
     - Pendente → Confirmado → Em Andamento → Na Oficina → Diagnóstico → Aprovação → Reparo → Concluído
   - Criar interface para mudança de status
   - Implementar validações para transições de estado
   - Adicionar registro de eventos para cada mudança de status

### Semana 4: Sistema de Notificações e Refinamento
*Considerando 4-6 horas/dia, 5 dias/semana*

7. **Sistema de Notificações** (2 dias):
   - Implementar notificações no sistema para mudanças de status
   - Criar templates de mensagens para WhatsApp
   - Implementar envio de notificações por WhatsApp via middleware
   - Adicionar preferências de notificação por usuário

8. **Testes e Correções** (2 dias):
   - Testes de integração do fluxo completo
   - Correção de bugs identificados
   - Otimização de performance
   - Testes de carga para o middleware

9. **Demonstração e Feedback** (1 dia):
   - Preparação de demonstração funcional
   - Coleta de feedback
   - Planejamento de ajustes para a próxima sprint

### Métricas de Sucesso
- **Eficiência Operacional**: Redução de 30% no tempo de processamento de ordens de serviço
- **Satisfação do Cliente**: NPS acima de 70 nos primeiros 3 meses
- **Conversão**: Aumento de 25% na taxa de conversão de diagnóstico para reparo
- **Financeiro**: Redução de 15% em custos operacionais através de otimização de rotas e processos

## 11. Conclusão

A arquitetura do EletroFix Hub Pro foi projetada com base na auditoria do sistema existente e nas necessidades específicas do negócio de manutenção de eletrodomésticos, com foco em:

1. **Experiência do Cliente**:
   - Facilidade de agendamento via WhatsApp (já implementado)
   - Acompanhamento em tempo real do status das ordens de serviço
   - Comunicação transparente através de notificações automáticas
   - Portal do cliente para visualização de histórico de serviços

2. **Eficiência Operacional**:
   - Otimização de rotas com visualização em mapa
   - Gestão inteligente de técnicos e oficinas
   - Automação da conversão de agendamentos para ordens de serviço
   - Fluxo completo de status para acompanhamento preciso

3. **Gestão Financeira**:
   - Controle preciso de pagamentos com modelo 50/50 para coleta/entrega
   - Registro detalhado de transações financeiras
   - Análise de rentabilidade por tipo de serviço
   - Dashboard financeiro com métricas-chave

4. **Inteligência de Negócio**:
   - Dashboard analítico para tomada de decisões
   - Assistente de IA para identificação de tendências
   - Previsão de demanda por região e tipo de serviço
   - Alertas para oportunidades de negócio

Esta arquitetura representa um equilíbrio entre inovação e praticidade, aproveitando os componentes já existentes e expandindo suas funcionalidades. O roadmap de implementação permite entregas incrementais de valor ao negócio, começando com o aprimoramento da integração WhatsApp-Supabase já existente e evoluindo para um sistema completo de gestão de ordens de serviço.

A implementação seguirá uma abordagem ágil, com sprints semanais e revisões constantes para garantir alinhamento com as necessidades do negócio e feedback dos usuários. O plano detalhado para as primeiras 4 semanas estabelece uma base sólida para o desenvolvimento contínuo do sistema.
