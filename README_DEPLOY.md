# Instruções para Deploy no Railway

Este documento contém instruções para fazer o deploy do middleware no Railway.

## Pré-requisitos

- Conta no Railway
- Acesso ao projeto no Railway
- Acesso ao Supabase

## Passos para o Deploy

1. Faça login no Railway: https://railway.app/
2. Acesse o projeto "fix-agendamento"
3. Vá para a seção "Deployments"
4. Clique em "Deploy" para fazer o deploy da versão mais recente

## Verificação do Deploy

Após o deploy, verifique se o middleware está funcionando corretamente:

1. Acesse a URL do middleware: https://fix-agendamento-production.up.railway.app/
2. Verifique o status do serviço: https://fix-agendamento-production.up.railway.app/health
3. Teste a conexão com o Supabase: https://fix-agendamento-production.up.railway.app/test-supabase

## Verificação do Schema do Supabase

Antes de fazer o deploy, é recomendável verificar se o schema do Supabase está atualizado:

```bash
python update_supabase_schema.py
```

Este script verificará se a tabela `agendamentos_ai` tem os campos necessários e tentará adicioná-los se necessário.

## Testes

Execute os testes para verificar se o middleware está funcionando corretamente:

```bash
python run_all_tests.py
```

Este script executará todos os testes disponíveis e exibirá um resumo dos resultados.

## Variáveis de Ambiente

O middleware requer as seguintes variáveis de ambiente:

- `SUPABASE_URL`: URL do projeto Supabase
- `SUPABASE_KEY`: Chave de serviço do Supabase

Estas variáveis já devem estar configuradas no Railway. Se precisar atualizá-las:

1. Acesse o projeto no Railway
2. Vá para a seção "Variables"
3. Atualize as variáveis conforme necessário

## Novos Campos

Os seguintes campos foram adicionados à tabela `agendamentos_ai`:

- `telefone`: Número de telefone do cliente
- `cpf`: CPF do cliente
- `email`: Email do cliente
- `origem`: Origem do agendamento (ex: "clientechat", "manual", "telefone")

Certifique-se de que estes campos existam na tabela antes de fazer o deploy.

## Formato do Payload

O middleware agora aceita o seguinte formato de payload:

```json
{
    "nome": "Nome do Cliente",
    "endereco": "Endereço completo",
    "equipamento": "Tipo de equipamento (ex: fogão, cooktop, coifa)",
    "problema": "Descrição do problema",
    "urgente": false,
    "telefone": "11999999999",
    "cpf": "12345678900",
    "email": "cliente@example.com",
    "origem": "clientechat"
}
```

## Integração com o Clientechat

O middleware está configurado para receber dados do Clientechat no seguinte formato:

```json
{"cpf":"#cpf#","nome":"#nome#","email":"#email#","urgente":"#urgente#","endereco":"#endereco#","problema":"#problema#","telefone":"#phone_contact#","equipamento":"#equipamento#","origem":"clientechat"}
```

Certifique-se de que o Clientechat esteja configurado para enviar os dados neste formato.

## Suporte

Em caso de problemas, entre em contato com o administrador do sistema.
