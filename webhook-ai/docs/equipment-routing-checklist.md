# Checklist de roteamento por equipamento (QA)

Este documento resume o comportamento **ideal e implementado** no `webhook-ai` para roteamento (IA + guard-rails determinísticos), com foco em:
- Perguntar o mínimo quando houver ambiguidade.
- Nunca “assumir” qualificadores que mudam o `service_type`.
- Manter consistência entre `policies.ts` → orquestrador → `buildQuote`.

## Regras por equipamento

| Equipamento (entrada do usuário) | Pergunta mínima (quando faltar) | Preferência / saída | Observações |
|---|---|---|---|
| Fogão / Cooktop (genérico) | “É a gás, elétrico ou indução?” | Ambíguo → perguntar | Evita confundir “fogão a gás” com coleta. |
| Fogão a gás | Se faltar: tipo (piso vs cooktop) e nº de bocas | `domicilio` | Guard-rail força domicílio quando há gás (residencial). |
| Cooktop a gás | Se faltar: nº de bocas + segmento (quando aplicável) | `domicilio` | `buildQuote` especializa cooktop (4/5 bocas, premium/importado/nacional). |
| Fogão elétrico / indução | — | `coleta_diagnostico` | Nunca domicílio para elétrico/indução. |
| Micro-ondas | “É embutido ou de bancada?” | Ambíguo → perguntar | Nunca assumir `mount`. |
| Micro-ondas de bancada | — | `coleta_conserto` | `buildQuote` mantém `coleta_conserto` (fallback local R$350). |
| Micro-ondas embutido | — | `coleta_diagnostico` | — |
| Forno (inclui “forno elétrico” sem mount) | “É embutido ou de bancada?” | Ambíguo → perguntar | No caso “forno” puro, o bot também pode oferecer opções (forno do fogão vs forno elétrico). |
| Forno de bancada | — | `coleta_conserto` | Alinhado com `policies.ts` e fallback determinístico. |
| Forno elétrico embutido | — | `coleta_diagnostico` | Regra explícita: forno elétrico **nunca** domicílio. |
| Lava-louças | — | `coleta_diagnostico` | Fallback determinístico injeta causas típicas quando possível. |
| Lavadora / Lava e seca | — | `coleta_diagnostico` | — |
| Secadora | — | `coleta_diagnostico` | — |
| Geladeira / Freezer / Refrigerador | — | `coleta_diagnostico` | — |
| Adega | — | `coleta_diagnostico` | Fallback determinístico injeta causas típicas. |
| Coifa / Depurador / Exaustor | — | `domicilio` (quote `domicilio_coifa`) | Visita diagnóstica no local (R$490 no fallback local). |

## Exceções: industrial/comercial

| Detectado | Saída | Observações |
|---|---|---|
| Forno industrial / Forno comercial / Fogão industrial / Geladeira comercial (médio porte) | `coleta_diagnostico` | Regra do orquestrador: não perguntar “embutido/bancada”. Nomenclatura padronizada para “forno comercial”. |
| Não atendemos: forno de esteira, grande porte, linha de produção | Recusa orientada | Bot informa escopo e redireciona. |

## Arquivos-fonte (para manutenção)

- `src/services/policies.ts`: regras explícitas e detecção de ambiguidade.
- `src/services/conversationOrchestrator.ts`: guard-rails determinísticos + fallback de orçamento.
- `src/services/toolsRuntime.ts`: mapeamento final de `service_type` (ex.: `domicilio_coifa`) e fallback local.
