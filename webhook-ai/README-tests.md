# Testes do webhook-ai

Este documento descreve como executar e o que os testes cobrem.

## Rodando os testes

- Instale dependências (raiz do projeto):
  - `npm install` (se necessário)
- Execute a suíte de testes:
  - `npm --prefix webhook-ai run test`

## O que é coberto

- Ambiguidade (apenas "fogão" deve sugerir opções 1/2/3)
- Entrega de orçamento marca `orcamento_entregue=true` e destrava agendamento
- Intenção de agendamento respeita o gating (equipamento + orçamento entregue)

## Notas de ambiente

- Em testes, `toolsRuntime.buildQuote` usa fallback offline determinístico caso a API de orçamento
  não esteja acessível. Em produção/dev normal, a API real é usada.
- As variáveis de ambiente de teste são definidas em `vitest.setup.ts`.
- O Supabase é mockável com `MOCK_SUPABASE=true`.

## Runbook

- Fluxo do funil/agendamento + smoke test em produção: `docs/bot-runbook.md`

