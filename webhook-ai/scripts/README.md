# Scripts de Smoke / E2E

Este diretório contém scripts de validação rápida do AI Router (webhook) e das ferramentas de orçamento/agendamento.

## Variáveis de ambiente

- WEBHOOK_BASE: base URL do webhook para testes via /test-message (ex.: http://localhost:3211)
- WEBHOOK_URL: base URL do webhook para rotas de teste (ex.: http://localhost:3211)
- API_URL: base URL do backend das ferramentas (orçamento/agendamento)
  - smoke-orcamento: default http://localhost:3000
  - smoke-agendamento: default http://localhost:3001
- BOT_TOKEN: token do bot para autenticar nas rotas /api/bot/tools/* (se aplicável)

## Scripts npm disponíveis (em webhook-ai/package.json)

- smoke:ai-router
  - Roda o smoke do AI Router variando textos e checando respostas
  - Requer: WEBHOOK_BASE

- smoke:e2e-gate
  - Valida o gate de marca+problema antes de orçar via conversa no webhook
  - Requer: WEBHOOK_URL

- smoke:orcamento
  - Chama POST /api/bot/tools/buildQuote com dados mínimos
  - Usa: API_URL (default http://localhost:3000), BOT_TOKEN

- smoke:agendamento
  - Chama POST /api/bot/tools/getAvailability para listar slots
  - Usa: API_URL (default http://localhost:3001), BOT_TOKEN

- smoke:all
  - Executa: smoke:ai-router → smoke:e2e-gate → smoke:orcamento → smoke:agendamento
  - Requer: definir WEBHOOK_BASE e WEBHOOK_URL antes de rodar

- smoke:all:local
  - Executa a mesma sequência do smoke:all
  - Define por padrão WEBHOOK_BASE/WEBHOOK_URL = http://localhost:3211
  - Útil quando o webhook está rodando localmente na porta 3211

## Exemplos (PowerShell)

- Rodar apenas o AI Router smoke em 3211:
  $env:WEBHOOK_BASE="http://localhost:3211"; npm --prefix webhook-ai run smoke:ai-router

- Rodar apenas o E2E gate em 3211:
  $env:WEBHOOK_URL="http://localhost:3211"; npm --prefix webhook-ai run smoke:e2e-gate

- Rodar bateria completa (definindo as duas variáveis):
  $env:WEBHOOK_BASE="http://localhost:3211"; $env:WEBHOOK_URL="http://localhost:3211"; npm --prefix webhook-ai run smoke:all

- Rodar bateria completa com defaults locais (sem precisar exportar):
  npm --prefix webhook-ai run smoke:all:local

## Observações

- Para evitar efeitos colaterais durante os E2E, habilite o modo de teste do webhook:
  POST /test-mode/enable

- Se seu backend de orçamento/agendamento não estiver nas portas padrão, ajuste API_URL e BOT_TOKEN de acordo.

