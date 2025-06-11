# Integração da API com o Frontend do EletroFix Hub Pro

Este documento descreve como a API do EletroFix Hub Pro está integrada com o frontend e como utilizar os serviços disponíveis.

## Configuração

A integração com a API é configurada através de variáveis de ambiente no arquivo `.env` (ou `.env.development`, `.env.production`, etc.):

```
VITE_API_URL=http://localhost:3000/api
```

Esta variável define a URL base da API que será utilizada pelo frontend. Você pode modificar este valor para apontar para diferentes ambientes (desenvolvimento, teste, produção).

## Arquivos de Configuração

Os seguintes arquivos de configuração estão disponíveis:

- `.env` - Configuração padrão
- `.env.development` - Configuração para ambiente de desenvolvimento
- `.env.staging` - Configuração para ambiente de staging
- `.env.production` - Configuração para ambiente de produção

## Cliente API

O cliente API (`apiClient.ts`) é responsável por gerenciar todas as requisições HTTP para a API. Ele oferece:

- Métodos para requisições HTTP (GET, POST, PUT, PATCH, DELETE)
- Gerenciamento automático de tokens de autenticação
- Refresh automático de tokens expirados
- Tratamento de erros
- Retry automático em caso de falhas
- Timeout configurável

### Exemplo de Uso Básico

```typescript
import { apiClient } from '../services/api';

// Fazer uma requisição GET
const response = await apiClient.get('/service-orders');

// Fazer uma requisição POST
const newOrder = await apiClient.post('/service-orders', {
  clientName: 'João Silva',
  equipmentType: 'Fogão',
  description: 'Problema nas bocas'
});
```

## Serviços Específicos

Para facilitar o uso da API, foram criados serviços específicos para cada entidade do sistema:

### Service Order Service

```typescript
import { serviceOrderService } from '../services/api';

// Obter todas as ordens de serviço
const { data, pagination } = await serviceOrderService.getAllServiceOrders({
  page: 0,
  limit: 10,
  status: 'pending'
});

// Obter uma ordem de serviço específica
const order = await serviceOrderService.getServiceOrderById('123');

// Atualizar o status de uma ordem de serviço
const updatedOrder = await serviceOrderService.updateServiceOrderStatus(
  '123',
  'in_progress',
  'Iniciando o diagnóstico'
);
```

### Client Service

```typescript
import { clientService } from '../services/api';

// Obter todos os clientes
const { data, pagination } = await clientService.getAllClients({
  page: 0,
  limit: 10,
  search: 'Silva'
});

// Criar um novo cliente
const newClient = await clientService.createClient({
  name: 'Maria Oliveira',
  email: 'maria@example.com',
  phone: '11987654321'
});
```

### Technician Service

```typescript
import { technicianService } from '../services/api';

// Obter técnicos disponíveis para uma data específica
const availableTechnicians = await technicianService.getAvailableTechnicians('2023-05-15');

// Atualizar localização de um técnico
const location = await technicianService.updateTechnicianLocation(
  '123',
  -23.5505,
  -46.6333
);
```

## Componente de Exemplo

Um componente de exemplo que demonstra a integração com a API está disponível em `src/components/examples/ApiIntegrationExample.tsx`. Este componente carrega e exibe uma lista de ordens de serviço, demonstrando:

- Como fazer requisições à API
- Como lidar com carregamento e erros
- Como exibir os dados retornados
- Como implementar paginação

## Tratamento de Erros

O cliente API inclui tratamento de erros robusto. Você pode capturar erros da seguinte forma:

```typescript
try {
  const order = await serviceOrderService.getServiceOrderById('123');
  // Processar a ordem de serviço
} catch (error) {
  // Verificar se é um erro de API com status e detalhes
  if (error.status === 404) {
    console.error('Ordem de serviço não encontrada');
  } else {
    console.error('Erro ao buscar ordem de serviço:', error.message);
  }
}
```

## Autenticação

O cliente API gerencia automaticamente a autenticação:

1. Armazena tokens no localStorage
2. Inclui o token em todas as requisições
3. Tenta renovar o token automaticamente quando expirado
4. Dispara um evento `auth:logout` quando a autenticação falha

## Configurações Avançadas

Você pode configurar parâmetros avançados através de variáveis de ambiente:

```
VITE_API_TIMEOUT=30000        # Timeout em milissegundos
VITE_API_RETRY_ATTEMPTS=3     # Número de tentativas em caso de falha
VITE_DEBUG_MODE=true          # Ativar modo de debug
```

## Melhores Práticas

1. **Use os serviços específicos** em vez de chamar o apiClient diretamente
2. **Trate erros adequadamente** em todos os componentes que fazem requisições
3. **Implemente indicadores de carregamento** para melhorar a experiência do usuário
4. **Use paginação** para listas grandes de dados
5. **Verifique a autenticação** antes de fazer requisições que exigem autenticação

## Solução de Problemas

Se você encontrar problemas com a integração da API:

1. Verifique se a API está em execução e acessível
2. Verifique se a URL da API está corretamente configurada no arquivo `.env`
3. Verifique os logs do console para mensagens de erro detalhadas
4. Use ferramentas como o DevTools do navegador para inspecionar as requisições
5. Verifique se o token de autenticação está sendo corretamente gerenciado
