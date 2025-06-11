# API do EletroFix Hub Pro

Esta é a API REST para o sistema EletroFix Hub Pro, que permite gerenciar ordens de serviço, clientes, técnicos, agendamentos e finanças.

## Requisitos

- Node.js 18.x ou superior
- npm ou yarn

## Instalação

1. Clone o repositório
2. Navegue até a pasta da API:
   ```
   cd api
   ```
3. Instale as dependências:
   ```
   npm install
   ```
4. Copie o arquivo de exemplo de variáveis de ambiente:
   ```
   cp .env.example .env
   ```
5. Configure as variáveis de ambiente no arquivo `.env`
6. Execute a migração do banco de dados:
   ```
   node db/run-migration.js 01_add_service_order_progress.sql
   ```

## Executando a API

### Modo de desenvolvimento

```
npm run dev
```

### Modo de produção

```
npm start
```

## Endpoints da API

A API possui os seguintes endpoints principais:

### Autenticação

- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/register` - Registro de usuário
- `POST /api/auth/logout` - Logout de usuário
- `GET /api/auth/me` - Obter usuário atual
- `PUT /api/auth/profile` - Atualizar perfil do usuário
- `POST /api/auth/change-password` - Alterar senha
- `POST /api/auth/forgot-password` - Solicitar redefinição de senha
- `POST /api/auth/reset-password` - Redefinir senha

### Ordens de Serviço

- `GET /api/service-orders` - Listar todas as ordens de serviço
- `GET /api/service-orders/:id` - Obter uma ordem de serviço específica
- `GET /api/service-orders/client/:clientId` - Listar ordens de serviço por cliente
- `GET /api/service-orders/technician/:technicianId` - Listar ordens de serviço por técnico
- `POST /api/service-orders` - Criar uma nova ordem de serviço
- `PUT /api/service-orders/:id` - Atualizar uma ordem de serviço
- `DELETE /api/service-orders/:id` - Excluir uma ordem de serviço
- `POST /api/service-orders/:id/assign-technician` - Atribuir técnico a uma ordem de serviço
- `PATCH /api/service-orders/:id/status` - Atualizar status de uma ordem de serviço
- `GET /api/service-orders/:id/progress` - Obter histórico de progresso de uma ordem de serviço

### Clientes

- `GET /api/clients` - Listar todos os clientes
- `GET /api/clients/:id` - Obter um cliente específico
- `POST /api/clients` - Criar um novo cliente
- `PUT /api/clients/:id` - Atualizar um cliente
- `DELETE /api/clients/:id` - Excluir um cliente

## Sistema de Ordens de Serviço

O sistema de ordens de serviço foi projetado para gerenciar todo o ciclo de vida de um serviço, desde a criação até a conclusão ou cancelamento.

### Status de Ordens de Serviço

As ordens de serviço podem ter os seguintes status:

- `pending` - Pendente (inicial)
- `scheduled` - Agendado
- `in_progress` - Em andamento
- `diagnosis` - Em diagnóstico
- `awaiting_parts` - Aguardando peças
- `awaiting_approval` - Aguardando aprovação do cliente
- `repair` - Em reparo
- `testing` - Em teste
- `completed` - Concluído
- `delivered` - Entregue
- `canceled` - Cancelado
- `returned` - Devolvido sem reparo

### Transições de Status

O sistema implementa regras de transição de status para garantir a integridade do fluxo de trabalho. Por exemplo, uma ordem de serviço não pode passar diretamente de `pending` para `completed` sem passar pelos status intermediários.

As transições permitidas são:

- De `pending` para: `scheduled`, `in_progress`, `diagnosis`, `canceled`
- De `scheduled` para: `in_progress`, `diagnosis`, `canceled`
- De `in_progress` para: `diagnosis`, `awaiting_parts`, `awaiting_approval`, `repair`, `testing`, `completed`, `canceled`, `returned`
- De `diagnosis` para: `awaiting_parts`, `awaiting_approval`, `repair`, `testing`, `completed`, `canceled`, `returned`
- De `awaiting_parts` para: `repair`, `canceled`, `returned`
- De `awaiting_approval` para: `repair`, `canceled`, `returned`
- De `repair` para: `testing`, `completed`, `canceled`
- De `testing` para: `repair`, `completed`, `canceled`
- De `completed` para: `delivered`, `returned`
- De `delivered` para: nenhum (estado final)
- De `canceled` para: nenhum (estado final)
- De `returned` para: nenhum (estado final)

### Histórico de Progresso

Cada mudança de status é registrada no histórico de progresso, permitindo rastrear todo o ciclo de vida da ordem de serviço. O histórico inclui:

- Status
- Data e hora da mudança
- Usuário que realizou a mudança
- Notas ou observações

### Cancelamento

Ao cancelar uma ordem de serviço, é obrigatório fornecer um motivo para o cancelamento, que fica registrado para referência futura.

## Migrações de Banco de Dados

O sistema utiliza migrações para gerenciar alterações no esquema do banco de dados. Para executar uma migração:

```bash
node db/run-migration.js nome_do_arquivo_de_migracao.sql
```

A migração `01_add_service_order_progress.sql` adiciona suporte ao histórico de progresso e validação de transições de status.

### Técnicos

- `GET /api/technicians` - Listar todos os técnicos
- `GET /api/technicians/:id` - Obter um técnico específico
- `POST /api/technicians` - Criar um novo técnico
- `PUT /api/technicians/:id` - Atualizar um técnico
- `DELETE /api/technicians/:id` - Excluir um técnico
- `PATCH /api/technicians/:id/location` - Atualizar localização do técnico
- `GET /api/technicians/status/available` - Obter técnicos disponíveis

### Serviços Agendados

- `GET /api/scheduled-services` - Listar todos os serviços agendados
- `GET /api/scheduled-services/:id` - Obter um serviço agendado específico
- `GET /api/scheduled-services/technician/:technicianId` - Listar serviços agendados por técnico
- `GET /api/scheduled-services/client/:clientId` - Listar serviços agendados por cliente
- `GET /api/scheduled-services/date-range` - Listar serviços agendados por intervalo de datas
- `POST /api/scheduled-services` - Criar um novo serviço agendado
- `PUT /api/scheduled-services/:id` - Atualizar um serviço agendado
- `DELETE /api/scheduled-services/:id` - Excluir um serviço agendado
- `PATCH /api/scheduled-services/:id/status` - Atualizar status de um serviço agendado

### Finanças

- `GET /api/financial` - Listar todas as transações financeiras
- `GET /api/financial/:id` - Obter uma transação financeira específica
- `GET /api/financial/service-order/:serviceOrderId` - Listar transações por ordem de serviço
- `GET /api/financial/type/:type` - Listar transações por tipo (receita/despesa)
- `GET /api/financial/status/:status` - Listar transações por status de pagamento
- `POST /api/financial` - Criar uma nova transação financeira
- `PUT /api/financial/:id` - Atualizar uma transação financeira
- `DELETE /api/financial/:id` - Excluir uma transação financeira
- `PATCH /api/financial/:id/status` - Atualizar status de pagamento de uma transação
- `GET /api/financial/summary/overview` - Obter resumo financeiro

## Autenticação

A API utiliza autenticação baseada em tokens JWT. Para acessar endpoints protegidos, é necessário incluir o token no cabeçalho da requisição:

```
Authorization: Bearer seu_token_jwt
```

## Integração com o Frontend

Para integrar a API com o frontend do EletroFix Hub Pro, configure o URL base da API no arquivo de configuração do frontend.
