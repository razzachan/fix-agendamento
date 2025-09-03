# Integração Augment Agent com WhatsApp, Clientechat (paralelo), Gemini CLI e Regras de Segurança

**Objetivo**  
Desejo que o Augment atue como **agente de IA e atendente completo** para o WhatsApp: capaz de responder dúvidas, fornecer suporte técnico, emitir orçamentos, criar ordens de serviço (OS), registrar solicitações e resolver demandas de forma autônoma. Terá acesso controlado ao meu sistema e banco de dados, e seguirá regras rígidas de segurança para evitar vazamento de informações. O projeto deve rodar **em paralelo** ao bot atual no **Clientechat** (middleware existente) como prova de conceito; se for bem-sucedido, migraremos. Sempre que necessário, o Augment deve **consultar a Gemini CLI** e trabalhar lado a lado com ela.

---

## Resumo executivo (o que enviar pro Augment)

Cole aqui todas as instruções: arquitetura, fluxo, requisitos, esqueleto de código, regras de segurança (entrada e saída de PII), integração com Gemini CLI, e tarefas. Este documento já contém tudo pronto para colar no Augment.

---

## Arquitetura proposta

```plaintext
[Usuário WhatsApp]
       |
       v
[API Oficial WhatsApp / Provedor (Twilio, 360Dialog, etc.)]
       |
       v
[Webhook no Backend do SaaS (paralelo ao Clientechat)]
       |
       +--> [Middleware de Controle de Fluxo (Clientechat)]
       |           |
       |           v
       |     [Banco de Dados / APIs Internas com Filtros de Segurança]
       |
       v
[Camada de Integração com Augment Agent + Gemini CLI]
       |
       v
[Resposta validada enviada de volta via API WhatsApp]
```

> Observação: O fluxo do Augment é **paralelo** ao Clientechat — ambos podem acessar o mesmo banco, mas com chaves e métricas separadas. A migração só será feita se o piloto for aprovado.

---

## Fluxo técnico (passo a passo)

1. Mensagem chega pela API do provedor (Meta Cloud API, Twilio, etc.) para o webhook do backend.
2. O **middleware** identifica o `from` (número do WhatsApp) e recupera o `user_id` e `permissões` do DB.
3. Se autorizado, o middleware aplica filtros e encaminha a requisição para o Augment (via API interna).
4. Antes de executar queries ou mudanças sensíveis, o Augment **consulta a Gemini CLI** para geração/validação de código, testes e checks.
5. O Augment executa (ou solicita que o backend execute) queries/ações restritas com `WHERE user_id = :user_id`.
6. A resposta retornada passa por **camada de validação/sanitização** do middleware.
7. A resposta final é enviada ao usuário via API do WhatsApp.
8. Logs registrados com dados mascarados e criptografados.

---

## Requisitos técnicos mínimos

- Backend em **Node.js (Express)** (exemplo fornecido).
- Comunicação com Augment e Gemini CLI via **HTTPS** (APIs protegidas, tokens em variáveis de ambiente).
- ORM recomendado: **Prisma** (ou Sequelize). Queries parametrizadas.
- Variáveis de ambiente para: `AUGMENT_API_URL`, `AUGMENT_TOKEN`, `GEMINI_CLI_URL`, `WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`.
- TLS obrigatório; tokens e segredos nunca no código.

---

## Esqueleto de código (exemplo)

> **NOTA:** salvar em repositório privado e configurar CI/CD com secrets.

### app.js (webhook)

```javascript
import express from 'express';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';
import { handleAugmentQuery } from './augment.js';
import { getUserByPhone, maskPhoneForLogs } from './middlewareUtils.js';

const app = express();
app.use(bodyParser.json());

app.post('/webhook/whatsapp', async (req, res) => {
  try {
    const message = req.body.entry[0].changes[0].value.messages[0].text.body;
    const from = req.body.entry[0].changes[0].value.messages[0].from;

    const user = await getUserByPhone(from);
    if (!user) return res.status(403).send({ error: 'Seu número não está autorizado para esta operação.' });

    const aiResponse = await handleAugmentQuery(message, from, user);

    await fetch(`https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: from,
        text: { body: aiResponse }
      })
    });

    res.sendStatus(200);
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.sendStatus(500);
  }
});

app.listen(3000, () => console.log('Webhook ativo na porta 3000'));
```

### augment.js (integração Augment + Gemini)

```javascript
import fetch from 'node-fetch';
import { sanitizeOutput, checkSensitiveInput } from './security.js';

export async function handleAugmentQuery(userMessage, userPhone, user) {
  // 1) Detectar PII na entrada e confirmar com usuário via fluxo (simplificado aqui)
  const piiDetected = checkSensitiveInput(userMessage);
  if (piiDetected) {
    // aqui o middleware deve confirmar com o usuário antes de prosseguir
    return 'Vi que você mandou dados sensíveis. Confirme que deseja prosseguir.';
  }

  // 2) Perguntar à Gemini CLI (se necessário)
  const geminiResp = await fetch(process.env.GEMINI_CLI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GEMINI_TOKEN}` },
    body: JSON.stringify({ query: userMessage, context: { user_phone: userPhone } })
  });
  const geminiData = await geminiResp.json();

  // 3) Consultar Augment com contexto e restrição ao usuário
  const response = await fetch(process.env.AUGMENT_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AUGMENT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: `${userMessage}

Gemini CLI:
${geminiData.output || ''}`,
      context: {
        user_id: user.id,
        security: { restrictToUser: user.id }
      }
    })
  });

  const data = await response.json();
  return sanitizeOutput(data.output, userPhone);
}
```

---

## Pacote de Regras de Segurança e Autenticação (completo)

### 1) Autenticação

- Mensagem sempre ligada ao `from` (número do WhatsApp).
- Sempre validar existência do número em `users` e recuperar `user_id` + `permissões`.
- Se não autorizado: mensagem padrão `Seu número não está autorizado para esta operação.`

### 2) Autorização / Escopos

- Permissões armazenadas por usuário (consultar_faturas, abrir_chamado, criar_os, etc.).
- Todas as ações do Augment passam por checagem de permissão.
- Queries sempre parametrizadas: `WHERE user_id = :user_id`.

### 3) Proteção contra vazamento

- Proibir respostas que tentem listar múltiplos clientes ou dados gerais.
- Se detectar tentativa: responder `Por segurança, não posso fornecer essas informações.`
- Sanitizar respostas: remover e-mails, CPFs, endereços completos quando não estritamente necessários.

### 4) Logs

- Gravar apenas: timestamp, operação, telefone mascarado (`+55****9999`), status.
- Logs sensíveis devem ser criptografados em repouso (AES-256) e com acesso restrito.

### 5) Comunicação segura

- HTTPS em todas as comunicações.
- Tokens em variáveis de ambiente; rotacionar periodicamente.
- O token do WhatsApp **nunca** deve ser enviado ao Augment.

### 6) Gemini CLI

- Chamadas intermediadas pelo middleware (registro obrigatório).
- Uso da Gemini como consultora técnica (geração de código, validações, testes). Não usar a Gemini para expor dados de usuários.

---

## Regras extras: entrada de dados sensíveis (CPF, nome completo, etc.)

### Detecção (regex sugerida)

- CPF: `\d{3}\.??\d{3}\.??\d{3}-?\d{2}`
- E-mail: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
- Nome completo: heurística mínima — >= 2 palavras com iniciais maiúsculas

### Fluxo ao detectar PII na mensagem do usuário

1. Interromper o envio automático ao Augment.
2. Perguntar ao usuário: `Vi que você enviou dados sensíveis (ex: CPF). Deseja prosseguir? Responda SIM para confirmar.`
3. Se confirmar, registrar confirmação com carimbo de tempo e prosseguir criptografando os dados.
4. Se necessário para busca, sempre verificar **número do telefone** associado para confirmar identidade.
5. Sempre mascarar o PII em logs e em respostas (ex: `***.***.***-**`, `João S.`).

### Uso restrito de CPF/nome para consultas

- CPF/nome podem ser usados para busca apenas se:
  - O phone number do remetente estiver associado ao registro encontrado; ou
  - Houver confirmação explícita do usuário em conversa.
- Nunca retornar listas com CPFs ou nomes.

---

## Sanitização de saída (exemplos de regras)

- Bloquear palavras-chave: `lista de clientes`, `todos os CPFs`, `dados de outro cliente`, etc.
- Se a resposta puder revelar PII não autorizado, substituir por `Desculpe, não posso fornecer essas informações.`

---

## Escopo funcional ampliado

O Augment Agent atuará como **atendente completo** no WhatsApp, com capacidade de:  
- Fornecer orçamentos;  
- Prestar suporte técnico;  
- Responder dúvidas;  
- Criar ordens de serviço (OS) com vínculo direto ao `user_id` e número do remetente;  
- Acompanhar status de OS abertas;  
- Encaminhar para atendimento humano quando necessário.

---

## Regras específicas para criação de OS

- Apenas usuários com a permissão `criar_os` podem acionar essa função.  
- Todos os campos da OS devem estar vinculados ao `user_id` do solicitante.  
- Se o usuário informar PII (CPF, nome completo, endereço), seguir o fluxo de confirmação antes de registrar.  
- O número do WhatsApp do solicitante deve ser gravado junto à OS para auditoria.  
- Logs da criação de OS devem ser criptografados e conter apenas dados essenciais (ID da OS, timestamp, telefone mascarado).

---

## Tarefas sugeridas para o Augment (PRs/Issues)

1. Implementar webhook seguro e validação de phone->user.
2. Criar camada de autorização por permissões no DB.
3. Implementar `checkSensitiveInput()` e fluxo de confirmação de PII.
4. Integrar Gemini CLI com log de chamadas e sandbox para geração de código.
5. Criar `sanitizeOutput()` robusta e testes unitários.
6. Implementar logs criptografados e rotação de chaves.
7. Rodar testes de penetração (basic auth, SQLi, etc.).

---

## Prompt mestre (para treinar o Augment a operar nesse fluxo)

````
Você é o Augment Agent. Seu papel: responder mensagens de WhatsApp ligadas ao número do remetente, consultando o banco apenas com filtros que garantam que os dados retornados pertençam àquele usuário. Sempre verifique permissões antes de executar ações. Se detectar dados sensíveis (CPF, nome completo, e-mail, endereço), peça confirmação ao usuário antes de prosseguir. Nunca exponha dados de terceiros. Quando precisar de auxílio técnico para criar/validar código ou comandos, pergunte à Gemini CLI e integre a resposta. Todas as respostas devem passar por sanitizeOutput() antes de serem enviadas. Operação é um piloto paralelo ao Clientechat; não altere nada no Clientechat sem autorização explícita.```

---

## Observações finais
- Este documento é um *pacote pronto* para enviar ao Augment. Ajustes finos podem ser necessários conforme o modelo das APIs que o Augment expõe (nomenclatura de campos, endpoints, etc.).
- Recomendo rodar o fluxo em staging com dados mockados antes de apontar para produção.

---

*Fim do documento.*
