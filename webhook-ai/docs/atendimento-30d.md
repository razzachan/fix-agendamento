# Atendimento (últimos 30 dias) — análise e otimizações

Data: 2026-02-16

Este documento resume uma análise *amostral* das conversas reais dos últimos 30 dias e descreve otimizações aplicadas no orquestrador para manter o fluxo mais humanizado e funcional, baseado nos padrões observados.

## Como o relatório foi gerado

Foi criado o script:
- `webhook-ai/scripts/last30d-report.mjs`

Execução (usa env do Railway, sem expor chaves localmente):
- `railway run -s webhook-ai-docker -- node webhook-ai/scripts/last30d-report.mjs`

Saídas locais:
- `scripts/out/last30d_report.json`
- `scripts/out/last30d_report.md`

> Observação: o relatório anonimiza o peer (telefone) e mostra apenas sufixo e hash.

## Principais padrões encontrados (amostra)

Com base no relatório gerado em `scripts/out/last30d_report.md`:

- Volume de mensagens com **equipamento não explícito** (`unknown`) é alto → o bot precisa reconduzir com uma pergunta curta e única.
- Há casos claros de **contaminação de contexto** (ex.: micro-ondas puxando `marca GE`/`problema` antigo) em sessões longas.
- Existem casos em que o cliente pediu **humano** e a sessão **não** ficou pausada (`handoff_paused=false`).

## Otimizações aplicadas (baseadas nos dados)

### 1) Handoff humano confiável (sem “continuar no bot”)
Arquivo:
- `webhook-ai/src/services/conversationOrchestrator.ts`

Mudança:
- A solicitação direta de humano agora seta **sempre**: `bot_paused=true`, `handoff_paused=true`, `stage='handoff_paused'`.
- A lógica de “retomar” (`voltar ao bot`) agora limpa também `handoff_paused` e `human_requested_at`.

Efeito esperado:
- Pedido de humano pausa de verdade e bloqueia o orquestrador até retomar.

### 2) Reset defensivo por troca explícita de equipamento
Arquivo:
- `webhook-ai/src/services/conversationOrchestrator.ts`

Mudança:
- Se o cliente **explicitamente** muda de família de equipamento (ex.: fogão → micro-ondas), o bot zera campos core do funil para evitar reaproveitar `marca/problema/mount` antigos.

Efeito esperado:
- Elimina quotes errados por “marca/problema herdados” de conversa anterior no mesmo peer.

### 3) Reset defensivo por inatividade
Arquivo:
- `webhook-ai/src/services/conversationOrchestrator.ts`

Mudança:
- Se existir `state.last_activity_at` e a sessão ficar inativa por muito tempo, o bot volta ao funil do zero (quando não está pausado para humano).

Configuração:
- `SESSION_IDLE_RESET_HOURS` (padrão: `168` = 7 dias)

Efeito esperado:
- Conversas com meses de intervalo não reaproveitam estado velho.

## Próximos passos sugeridos (operacional)

1) Deploy do `webhook-ai` para produção.
2) Re-teste com:
   - Pedido de humano (“quero falar com um humano”) → deve pausar.
   - Micro-ondas após um atendimento anterior no mesmo número → não deve puxar marca/problema antigo.
3) (Opcional) Ajustar `SESSION_IDLE_RESET_HOURS` conforme o perfil de retorno de clientes.
