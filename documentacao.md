## Arquitetura do Orquestrador (webhook-ai)

### Visão geral

- Ponto de entrada: `webhook-ai/src/services/conversationOrchestrator.ts`, função `orchestrateInbound(from, body, session)`.
- Roteamento principal via IA (`aiBasedRouting`) com fallback legado.
- Fluxos principais:
	- Orçamento (`orcamento_equipamento`).
	- Agendamento (`agendamento_servico`).
	- Instalação, informação e políticas.

Toda a suíte de testes Vitest em `webhook-ai/test` está verde e serve como especificação viva do comportamento.

### Fluxo canônico de agendamento

- Implementação canônica: `webhook-ai/src/services/orchestrator/schedulingFlow.ts`.
- Função exportada: `executeAIAgendamento(decision, session?, body?, from?)`.
- Responsabilidades principais:
	- **ETAPA 1 – Coleta de dados pessoais e oferta de horários**
		- Garante que os dados mínimos (nome, endereço, email, CPF, etc.) estejam preenchidos.
		- Chama `aiScheduleStart` para o middleware de agendamento.
		- Extrai opções de horários do texto/JSON de resposta.
		- Persistência em sessão: `last_offered_slots` e `last_offered_slots_full`.
	- **ETAPA 2 – Confirmação de horário**
		- Interpreta seleção de horário (opções 1/2/3, manhã/tarde/noite ou horário explícito).
		- Chama `aiScheduleConfirm` para confirmar ou remarcar.
		- Se houver erro de campos obrigatórios, volta para `aiScheduleStart`, complementa os dados e tenta novamente.
	- **Anti-loop de agendamento**
		- Usa `orcamento_entregue`, `accepted_service`, `last_offered_slots` e contexto para evitar loops infinitos.
	- **Caso especial de dropoff após coleta_diagnostico**
		- Quando `session.state.last_quote.service_type === 'coleta_diagnostico'` e o cliente pergunta se pode “levar / entregar / deixar” na empresa/escritório/oficina, retorna um script fixo (texto validado por testes) explicando que ali é só escritório e reforçando a coleta e o agendamento.

### Como o orquestrador usa o fluxo de agendamento

- `conversationOrchestrator.ts` importa o fluxo canônico:
	- `import { executeAIAgendamento as executeAIAgendamentoFlow } from './orchestrator/schedulingFlow.js';`
- Situação das funções locais:
	- `executeAIAgendamentoLegacy(...)`: implementação antiga completa (mantida apenas como referência, **não usada**).
	- `executeAIAgendamento(...)`: wrapper fino que delega diretamente para `executeAIAgendamentoFlow(...)`.
- Fast-paths dentro de `orchestrateInbound`:
	- Quando o contexto já é de agendamento e o cliente manda apenas dados (nome, endereço, telefone, etc.), o orquestrador chama diretamente `executeAIAgendamento` com a `acao_principal` adequada, sem reconsultar o roteador de IA.

### Guard global de dropoff (coleta_diagnostico)

- Local: `orchestrateInbound`, logo após a checagem de ambiguidade de equipamento.
- Lógica resumida:
	- Lê `session.state.last_quote` (ou `lastQuote`).
	- Se `service_type === 'coleta_diagnostico'` **e** a mensagem atual combina com:
		- “posso / pode / dá” + “levar / entregar / deixar” + “empresa / escritório / oficina”,
	- então responde imediatamente com o script fixo de dropoff (sem chamar IA, nem agendamento, nem orçamento).
- Cobertura de testes:
	- `webhook-ai/test/dropoff-coleta-diagnostico.spec.ts` valida:
		- Que o script sai exatamente como esperado.
		- Que **não** dispara para outros `service_type`.

### Fluxo de orçamento e desambiguação de montagem (micro/forno)

- Implementação principal: função de orçamento em `conversationOrchestrator.ts` (por exemplo, `executeAIOrçamento`).

1. **Gate de dados mínimos**
	 - Antes de gerar orçamento, exige:
		 - `marca` e `problema` definidos.
	 - Se faltar algo, retorna mensagens orientando o cliente:
		 - Pedir marca.
		 - Pedir descrição do problema.
		 - Ou ambos, quando nenhum dos dois está presente.

2. **Desambiguação de montagem para micro-ondas e forno**
	 - Depois de garantir `marca` e `problema`, mas **antes** de chamar `buildQuote(...)`, existe uma checagem específica:
		 - Calcula `eqMountCheck = (equipment || dados.equipamento).toLowerCase()`.
		 - Considera que já há informação de montagem (`hasMountInfo`) se:
			 - `mount` está preenchido **ou**
			 - o texto da mensagem contém “embutid” ou “bancada”.
		 - Se o equipamento for micro-ondas ou forno (`/micro/` ou `/forno/`) **e** `hasMountInfo` for falso:
			 - A função **não** chama `buildQuote`.
			 - Em vez disso, responde algo como:
				 - “Só mais um detalhe para eu orçar certinho: ele é embutido ou de bancada?”
	 - Efeito prático:
		 - Quando o cliente não especifica se o micro-ondas/forno é embutido ou de bancada, a primeira resposta é sempre uma pergunta clara sobre a montagem, antes do orçamento.

3. **Geração de orçamento normal**
	 - Quando já existe `mount` (no JSON da IA ou no texto da mensagem):
		 - Chama `buildQuote({ service_type, equipment, brand, problem, mount, power_type, num_burners, segment })`.
		 - Ajusta campos auxiliares (como `equipment` em `quote`).
		 - Em alguns casos, injeta `causas_possiveis` específicas (por exemplo, adega).
		 - Usa `summarizeToolResult('orcamento', quote, session, body)` para gerar o texto final.
		 - Prefixo padrão inclui marca e problema já conhecidos.

- Cobertura de testes para esse comportamento:
	- `webhook-ai/test/ambiguity.spec.ts`:
		- Bloco “Desambiguação de mount (micro/forno)” garante que, para `micro-ondas` ou `forno elétrico` sem `mount`, o texto retornado contenha “embutid” ou “bancada”.
	- `webhook-ai/test/equipment-coverage.spec.ts`:
		- Garante que, quando `mount` já é informado (bancada/embutido), o fluxo gera os textos esperados:
			- Micro-ondas/forno de bancada → “coleta + conserto”.
			- Micro-ondas embutido → “coleta diagnóstico”.

### Testes automatizados como especificação

- Todos os testes em `webhook-ai/test` passaram no último run completo (`npx vitest run` a partir da pasta `webhook-ai`):
	- `equipment-coverage.spec.ts`
	- `orchestrator-flow.spec.ts`
	- `scheduling-e2e.spec.ts`
	- `installation.spec.ts`
	- `ambiguity.spec.ts`
	- `scheduling.spec.ts`
	- `dropoff-coleta-diagnostico.spec.ts`
	- `optimistic-locking.spec.ts`
	- `pending-switch.spec.ts`
	- `out-of-context.spec.ts`
	- `human-escalation.spec.ts`
	- `policies.spec.ts`
	- `stage-machine.spec.ts`
	- `ai-router-schema.spec.ts`
	- `peerid-normalization.spec.ts`

Esses testes funcionam como “contrato” do comportamento do orquestrador. Qualquer alteração estrutural no fluxo de orçamento, agendamento, instalação ou políticas deve ser acompanhada de uma nova execução da suíte para garantir que o comportamento esperado continue preservado.

