# Fix Fogões Middleware

API para receber dados de agendamentos do WhatsApp e inserir no Supabase.

## Problema Identificado

O middleware está enfrentando um problema de permissão ao tentar inserir dados na tabela `agendamentos_ai` do Supabase. O erro específico é:

```
new row violates row-level security policy for table "agendamentos_ai"
```

Este erro ocorre porque a chave de API anônima que está sendo usada não tem permissão para inserir dados na tabela devido às políticas de segurança em nível de linha (RLS) configuradas no Supabase.

## Soluções Possíveis

### 1. Usar uma Chave de Serviço (Service Key)

A chave de serviço tem permissões mais amplas e pode ignorar as políticas RLS. Para implementar esta solução:

1. Acesse o dashboard do Supabase: https://app.supabase.com/
2. Selecione o projeto "Fix"
3. Vá para "Settings" > "API"
4. Copie a "service_role key" (NÃO a anon key)
5. Atualize a variável de ambiente `SUPABASE_KEY` no Railway com esta chave de serviço

### 2. Configurar Políticas RLS para Permitir Inserções

Se preferir manter a segurança em nível de linha, você pode configurar uma política RLS que permita inserções específicas:

1. Acesse o dashboard do Supabase: https://app.supabase.com/
2. Selecione o projeto "Fix"
3. Vá para "Table Editor" > "agendamentos_ai"
4. Clique em "Authentication" > "Policies"
5. Adicione uma nova política para INSERT com a condição apropriada, por exemplo:
   ```sql
   -- Permitir inserções de qualquer origem
   true
   ```
   Ou uma condição mais específica:
   ```sql
   -- Permitir inserções apenas para agendamentos pendentes
   status = 'pendente'
   ```

## Configuração no Railway

Para garantir que o middleware funcione corretamente no Railway, configure as seguintes variáveis de ambiente:

1. Acesse o Railway Dashboard: https://railway.app/dashboard
2. Selecione o projeto "fix-agendamento"
3. Vá para a aba "Variables"
4. Adicione ou atualize as seguintes variáveis:
   - `SUPABASE_URL`: https://hdyucwabemspehokoiks.supabase.co
   - `SUPABASE_KEY`: [Chave de serviço do Supabase]
5. Clique em "Deploy" para aplicar as mudanças

## Testando Localmente

Para testar o middleware localmente:

1. Clone o repositório
2. Crie um arquivo `.env` na raiz do projeto com as variáveis:
   ```
   SUPABASE_URL=https://hdyucwabemspehokoiks.supabase.co
   SUPABASE_KEY=[Chave de serviço do Supabase]
   ```
3. Instale as dependências: `pip install -r requirements.txt`
4. Execute o script de verificação: `python verify_env.py`
5. Inicie o servidor: `uvicorn main:app --reload`
6. Teste o endpoint: `curl -X POST http://localhost:8000/agendamento-inteligente -H "Content-Type: application/json" -d "{\"nome\":\"Cliente Teste\",\"endereco\":\"Rua Teste, 123\",\"equipamento\":\"Fogão\",\"problema\":\"Não acende\"}"`

## Endpoints Disponíveis

- `GET /`: Verificação de saúde da API
- `POST /`: Recebe dados de agendamento
- `POST /agendamento`: Alias para o endpoint principal
- `POST /agendamento-inteligente`: Endpoint para agendamento via Clientechat
- `GET /agendamento-inteligente`: Verificação do serviço de agendamento inteligente
- `GET /health`: Endpoint de verificação de saúde para monitoramento
- `GET /test-supabase`: Endpoint para testar a conexão com o Supabase

## Formato do Payload

```json
{
    "nome": "Nome do Cliente",
    "endereco": "Endereço completo",
    "equipamento": "Tipo de equipamento (ex: fogão, cooktop, coifa)",
    "problema": "Descrição do problema",
    "urgente": false,
    "telefone": "11999999999",
    "cpf": "12345678900",
    "email": "cliente@example.com"
}
```

## Logs e Depuração

O middleware foi configurado para fornecer logs detalhados sobre o processamento das requisições. Verifique os logs no Railway para identificar possíveis problemas.
