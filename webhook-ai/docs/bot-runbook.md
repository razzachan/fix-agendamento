# webhook-ai — Runbook (funnel, agendamento, smoke test)

Este runbook é um lembrete rápido de como o bot guarda estado (funil), quais flags controlam o agendamento e como fazer um smoke test em produção via endpoints de teste.

## Estado da sessão (Supabase)

- A sessão é persistida em `bot_sessions.state` (merge-on-write) via `setSessionState(...)`.
- O estado **canônico** do funil fica em `state.funnel`.
- Por compatibilidade, os dados também são espelhados em `state.dados_coletados`.

Arquivos relacionados:
- Funil/normalização/merge: `src/services/funnelState.ts`
- Orquestrador principal: `src/services/conversationOrchestrator.ts`
- Store/persistência/optimistic locking: `src/services/sessionStore.ts`

### Campos comuns do funil (`state.funnel`)

Exemplos (não é uma lista exaustiva):
- `equipamento` (ex.: `micro-ondas`, `geladeira`, `coifa`)
- `marca`
- `problema`
- `mount` (ex.: `bancada`, `embutido`, `piso`, etc., dependendo do equipamento)
- `power_type` (quando aplicável)

A cada turno:
- O orquestrador extrai `dados_extrair` da decisão da IA.
- Aplica `mergeFunnelState(...)` para não “apagar” campos já coletados.
- Sincroniza o resultado no legado (`applyFunnelToDadosColetados(...)`).

## Agendamento (gating + flags)

A política do fluxo é: **só agendar depois do orçamento ter sido entregue**.

Flags/chaves usadas com frequência:
- `orcamento_entregue: true` → destrava o agendamento.
- `accepted_service: true` + `accepted_service_at` → persistem o aceite explícito do cliente.
- `collecting_personal_data: true` → o bot está coletando dados (nome/endereço/CPF/email).
- `pending_time_selection: true` → já mostrou horários e está aguardando escolha.
- `schedule_confirmed: true` + `last_schedule_confirmed_at` → agendamento confirmado.
- `stage` costuma refletir o macro-estado: `collecting_core`, `collecting_personal`, `scheduled`, etc.

Arquivos relacionados:
- Fluxo de agendamento: `src/services/orchestrator/schedulingFlow.ts`

## Endpoints úteis (debug/test)

- `GET /health`
  - Confere se o serviço está de pé e se o WhatsApp está conectado.

- `POST /test-session`
  - Cria/recupera uma sessão de teste (a sessão é identificada por `from`).

- `POST /test-message`
  - Envia uma mensagem simulada para `from` (usando a mesma sessão persistente).

- `POST /sessions/reset`
  - Reseta a sessão por `peer` (útil para repetir smoke test sem “sujeira” de estado).

## Smoke test em produção (Railway)

Base URL (produção):
- `https://webhook-ai-docker-production.up.railway.app`

### PowerShell (Windows) — dica importante

No PowerShell, `curl` normalmente é um alias de `Invoke-WebRequest`.
Use `curl.exe` e mande o JSON via stdin para evitar escaping quebrado:

- Padrão seguro: `Write-Output '{...}' | curl.exe ... --data-binary '@-'`

### 1) Verificar saúde e conexão do WhatsApp

```powershell
curl.exe -sS https://webhook-ai-docker-production.up.railway.app/health
```

### 2) Criar sessão de teste

```powershell
$body = '{
  "from": "whatsapp:+550000000001"
}'

Write-Output $body | curl.exe -sS -X POST https://webhook-ai-docker-production.up.railway.app/test-session `
  -H "Content-Type: application/json" `
  --data-binary '@-'
```

Opcional (recomendado para repetir o teste com o mesmo número): resetar sessão antes

```powershell
$body = '{
  "peer": "whatsapp:+550000000001",
  "channel": "whatsapp"
}'

Write-Output $body | curl.exe -sS -X POST https://webhook-ai-docker-production.up.railway.app/sessions/reset `
  -H "Content-Type: application/json" `
  --data-binary '@-'
```

### 3) Pedir orçamento (ex.: micro-ondas bancada)

```powershell
$body = '{
  "from": "whatsapp:+550000000001",
  "body": "Micro-ondas LG de bancada. Nao esquenta e so gira."
}'

Write-Output $body | curl.exe -sS -X POST https://webhook-ai-docker-production.up.railway.app/test-message `
  -H "Content-Type: application/json" `
  --data-binary '@-'
```

Critérios esperados:
- Retorna um texto com orçamento e pergunta se deseja agendar.
- Sessão deve ficar com `orcamento_entregue=true` e `state.funnel` preenchido.

### 4) Aceitar o orçamento

```powershell
$body = '{
  "from": "whatsapp:+550000000001",
  "body": "Eu aceito o orcamento."
}'

Write-Output $body | curl.exe -sS -X POST https://webhook-ai-docker-production.up.railway.app/test-message `
  -H "Content-Type: application/json" `
  --data-binary '@-'
```

Critérios esperados:
- Entra em coleta de dados pessoais.
- Sessão marca `accepted_service=true` e `stage` muda para coleta pessoal.

### 5) Enviar dados pessoais

```powershell
$body = '{
  "from": "whatsapp:+550000000001",
  "body": "Meu nome e Maria. Endereco Avenida Teste, 987. CPF 987.654.321-00. Email maria@example.com"
}'

Write-Output $body | curl.exe -sS -X POST https://webhook-ai-docker-production.up.railway.app/test-message `
  -H "Content-Type: application/json" `
  --data-binary '@-'
```

Critérios esperados:
- Retorna lista de horários (slots).

### 6) Escolher horário (ex.: opção 1)

```powershell
$body = '{
  "from": "whatsapp:+550000000001",
  "body": "1"
}'

Write-Output $body | curl.exe -sS -X POST https://webhook-ai-docker-production.up.railway.app/test-message `
  -H "Content-Type: application/json" `
  --data-binary '@-'
```

Critérios esperados:
- Retorna "Agendamento confirmado".
- Sessão marca `schedule_confirmed=true` e `stage='scheduled'`.

### 7) Inspecionar sessão

```powershell
$body = '{
  "from": "whatsapp:+550000000001"
}'

Write-Output $body | curl.exe -sS -X POST https://webhook-ai-docker-production.up.railway.app/test-session `
  -H "Content-Type: application/json" `
  --data-binary '@-'
```

## Observação: erros de JSON

Se o corpo JSON vier malformado, o servidor retorna `400` com mensagem de JSON inválido (em vez de `500`).
