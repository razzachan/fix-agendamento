import type { AIRouterAction, AIRouterDecision } from './aiRouterDecisionSchema.js';
import type { ChatMessage, ChatOptions } from '../llmClient.js';
import type { SessionRecord } from '../sessionStore.js';
import { guessFunnelFields } from '../funnelGuesser.js';
import { isSameEquipmentFamily } from '../funnelState.js';
import { getPreferredServicesForEquipment } from '../policies.js';

export type MultiTextReply = { texts: string[] };

export type InstallContext = {
  negatedInstall: boolean;
  mentionsInstall: boolean;
  looksLikeRepair: boolean;
  shouldTreatAsInstall: boolean;
};

export type ActionHandlerContext = {
  decision: AIRouterDecision;
  from: string;
  body: string;
  session?: SessionRecord;
  allBlocks?: any[];

  installCtx: InstallContext;

  detectPriorityIntent: (text: string) => string | null;
  hasExplicitAcceptance: (text: string) => boolean;

  executeAIOrcamento: (
    decision: AIRouterDecision,
    session?: SessionRecord,
    body?: string
  ) => Promise<string | MultiTextReply>;
  executeAIInformacao: (decision: AIRouterDecision, allBlocks?: any[]) => Promise<string>;
  executeAIAgendamento: (
    decision: any,
    session: SessionRecord | undefined,
    body: string,
    from: string
  ) => Promise<string>;

  logAIRoute: (event: string, payload: any) => Promise<void>;

  buildSystemPrompt: (systemPrompt: string | undefined, extra?: any) => string;
  chatComplete: (options: ChatOptions, messages: ChatMessage[]) => Promise<string>;
  getActiveBot: () => Promise<any>;
};

export function buildActionHandlers(
  ctx: ActionHandlerContext
): Record<AIRouterAction, () => Promise<string | MultiTextReply | null>> {
  const {
    decision,
    from,
    body,
    session,
    allBlocks,
    installCtx,
    detectPriorityIntent,
    hasExplicitAcceptance,
    executeAIAgendamento,
    executeAIOrcamento,
    executeAIInformacao,
    logAIRoute,
    buildSystemPrompt,
    chatComplete,
    getActiveBot,
  } = ctx;

  function looksLikeMultiEquipMessage(text: string): boolean {
    const raw = String(text || '').trim();
    if (!raw) return false;
    const lower = raw.toLowerCase();
    if (/\b(2\s*equip|dois\s+equip|2\s*itens|dois\s+itens|multi\s*equip)\b/i.test(lower)) return true;
    if (/\bitem\s*1\b|\bitem\s*2\b|\bequipamento_2\b|\bmarca_2\b|\bproblema_2\b/i.test(lower)) return true;
    if (/\b1\)\b[\s\S]*\b2\)\b/i.test(lower)) return true;
    try {
      const g: any = guessFunnelFields(raw);
      if (Array.isArray(g?.equipamentosEncontrados) && g.equipamentosEncontrados.length >= 2) return true;
    } catch {}
    return false;
  }

  return {
    gerar_orcamento: async () => {
      // Anti-loop: se o cliente respondeu com aceite (ex.: "sim") e já temos
      // contexto mínimo (equipamento + problema), avance para agendamento
      try {
        const sessionData = (session as any)?.state?.dados_coletados || {};
        const hasEquipmentContext = !!sessionData.equipamento;
        // Endurecer: não considerar 'gostaria' isolado como intenção de agendar
        const agendamentoKeywords =
          /\b(agendar|marcar|aceito|aceitar|quero\s+(agendar|marcar)|vamos\s+(agendar|marcar)|sim|ok|beleza|pode|vou\s+(agendar|marcar)|confirmo|fechado|fechou)\b/i;
        const isAgendamentoIntent = agendamentoKeywords.test(body || '');
        const isTimeSelection = !!(
          body &&
          /^\s*(?:op(?:ç|c)[aã]o\s*)?([123])(?:\s*[-.)]?\s*(?:manh[aã]|tarde|noite))?\s*$/i.test(
            (body as string).trim()
          )
        );
        const accepted = hasExplicitAcceptance(body || '');
        const hasQuoteDelivered = !!(session as any)?.state?.orcamento_entregue;
        const pendingTime = !!(session as any)?.state?.pending_time_selection;
        if (
          (pendingTime && (isTimeSelection || isAgendamentoIntent || accepted)) ||
          (hasEquipmentContext && hasQuoteDelivered && (accepted || isAgendamentoIntent || isTimeSelection))
        ) {
          return await executeAIAgendamento(decision, session, body, from);
        }
      } catch {}

      // Guardião universal: se o usuário enviou 1/2/3 ou períodos (manhã/tarde/noite), priorize agendamento
      try {
        const isTimeSelectionX =
          (!!body &&
            /^\s*(?:op(?:ç|c)[aã]o\s*)?([123])(?:\s*[-.)]?\s*(?:manh[aã]|tarde|noite))?\s*$/i.test(
              (body as string).trim()
            )) || /\b(manh[aã]|tarde|noite)\b/i.test(String(body || ''));
        if (isTimeSelectionX) {
          return await executeAIAgendamento(decision, session, body, from);
        }
      } catch {}

      // BYPASS: se parece dados pessoais e já houve aceite/orçamento, ir direto pra coleta
      try {
        const stG = ((session as any)?.state || {}) as any;
        const collectingG = !!stG.collecting_personal_data;
        const acceptedPersistedG = !!stG.accepted_service;
        const quoteDeliveredG = !!stG.orcamento_entregue;
        const txtG = String(body || '');
        const likelyNameG = !!(
          txtG &&
          /^[A-Za-z\u00C0-\u00ff]{2,}(?:\s+[A-Za-z\u00C0-\u00ff]{2,}){1,}\s*$/.test(txtG.trim()) &&
          !/[\d@]/.test(txtG)
        );
        const looksPersonalG =
          /(nome|endere[cç]o|endere[çc]o|rua|avenida|av\.|r\.|cep|cpf|email|@|\b\d{5}-?\d{3}\b)/i.test(txtG) ||
          likelyNameG;
        if ((collectingG || acceptedPersistedG || quoteDeliveredG) && looksPersonalG) {
          return await executeAIAgendamento(
            { intent: 'agendamento_servico', acao_principal: 'coletar_dados', dados_extrair: {} },
            session,
            body,
            from
          );
        }
      } catch {}

      return await executeAIOrcamento(decision, session, body);
    },

    coletar_dados: async () => {
      // INSTALAÇÃO: quando a própria decisão já é "instalacao", não dependa do texto bruto
      // (alguns testes usam strings com encoding quebrado, onde detectPriorityIntent() pode falhar).
      if (decision.intent === 'instalacao' && installCtx.shouldTreatAsInstall) {
        const out =
          decision.resposta_sugerida ||
          'Legal! Para a instalação, preciso de: equipamento, tipo (embutido ou bancada), local exato de instalação, distância do ponto de água/gás quando aplicável e se já há fixação/suportes. Pode me passar esses dados?';
        await logAIRoute('ai_route_effective', {
          from,
          body,
          original: decision,
          effective: { intent: 'instalacao', acao_principal: 'coletar_dados' },
          reply: out,
        });
        return out;
      }

      // SAUDAÇÕES: Usar GPT humanizado para responder naturalmente
      if (decision.intent === 'saudacao_inicial') {
        console.log('[DEBUG] SAUDAÇÃO DETECTADA - Usando GPT humanizado');

        // Guardrail: o roteador por IA às vezes classifica incorretamente mensagens ricas
        // (ex.: pedido de orçamento com 2 itens) como saudação inicial.
        // Nesses casos, NÃO chame GPT de saudação; execute o fluxo de orçamento determinístico.
        try {
          const raw = String(body || '').trim();
          const lower = raw.toLowerCase();
          const asksBudget = /\b(or[cç]amento|orcamento|quanto|pre[cç]o|preco|valor|custa)\b/i.test(lower);
          let hasCoreSignal = false;
          try {
            const g: any = guessFunnelFields(raw);
            hasCoreSignal = !!(g?.equipamento || g?.marca || g?.problema);
          } catch {}

          if ((asksBudget || hasCoreSignal || looksLikeMultiEquipMessage(raw)) && raw.length >= 6) {
            const forced: any = {
              ...decision,
              intent: 'orcamento',
              acao_principal: 'gerar_orcamento',
              dados_extrair: (decision as any)?.dados_extrair || {},
            };
            await logAIRoute('ai_route_effective', {
              from,
              body,
              original: decision,
              effective: { intent: 'orcamento', acao_principal: 'gerar_orcamento', forced_from: 'saudacao_inicial' },
              reply: '[forced_executeAIOrcamento]',
            });
            return await executeAIOrcamento(forced, session, body);
          }
        } catch {}

        try {
          // Em modo de teste, evitar saudação genérica e ir direto ao objetivo do fluxo
          try {
            const { isTestModeEnabled } = await import('../testMode.js');
            if (isTestModeEnabled && isTestModeEnabled()) {
              const sd = ((session as any)?.state?.dados_coletados || {}) as any;
              if (!sd.equipamento || !sd.marca || !sd.problema) {
                const out =
                  'Para te ajudar melhor: qual é o equipamento? Em seguida, me informe a marca do equipamento e o problema específico.';
                await logAIRoute('ai_route_effective', {
                  from,
                  body,
                  original: decision,
                  effective: { intent: 'saudacao_inicial', acao_principal: 'resposta_deterministica_teste' },
                  reply: out,
                });
                return out;
              }
            }
          } catch {}

          const saudacaoPrompt = `${buildSystemPrompt(((await getActiveBot()) as any)?.personality?.systemPrompt, undefined)}\n\nMensagem do usuário: "${body}"\n\nResponda de forma natural e brasileira como uma pessoa real faria. Cumprimente de volta e depois pergunte como pode ajudar com equipamentos domésticos.`;

          const response = await chatComplete(
            { provider: 'openai', model: process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini' },
            [
              { role: 'system', content: saudacaoPrompt },
              { role: 'user', content: body || '' },
            ]
          );

          const out = response || decision.resposta_sugerida || 'Oi! Tudo bem? Como posso te ajudar hoje?';
          await logAIRoute('ai_route_effective', {
            from,
            body,
            original: decision,
            effective: { intent: 'saudacao_inicial', acao_principal: 'resposta_humanizada' },
            reply: out,
          });
          return out;
        } catch (e) {
          console.log('[DEBUG] Erro no GPT humanizado, usando fallback:', e);
          return decision.resposta_sugerida || 'Oi! Tudo bem? Como posso te ajudar hoje?';
        }
      }

      // Override por prioridade de intenção (outras situações)
      const pr = detectPriorityIntent(body);
      if (pr === 'reagendamento') {
        const out =
          'Perfeito! Para reagendar, me informe o número da sua OS (se tiver). Se não tiver, me passe nome, telefone e endereço. Qual a melhor data e horário para você?';
        await logAIRoute('ai_route_effective', {
          from,
          body,
          original: decision,
          effective: { intent: 'reagendamento', acao_principal: 'coletar_dados' },
          reply: out,
        });
        return out;
      }
      if (pr === 'cancelamento') {
        const out =
          'Tudo certo! Para concluir o cancelamento, me informe o número da sua OS. Se não tiver, me passe nome, telefone e endereço que localizo seu atendimento para cancelar.';
        await logAIRoute('ai_route_effective', {
          from,
          body,
          original: decision,
          effective: { intent: 'cancelamento', acao_principal: 'coletar_dados' },
          reply: out,
        });
        return out;
      }
      if (pr === 'instalacao' && installCtx.shouldTreatAsInstall) {
        const out =
          'Legal! Para a instalação, preciso de: equipamento, tipo (embutido ou bancada), local exato de instalação, distância do ponto de água/gás quando aplicável e se já há fixação/suportes. Pode me passar esses dados?';
        await logAIRoute('ai_route_effective', {
          from,
          body,
          original: decision,
          effective: { intent: 'instalacao', acao_principal: 'coletar_dados' },
          reply: out,
        });
        return out;
      }

      // SISTEMA DE CONTEXTO INTELIGENTE
      const sessionData = (session as any)?.state?.dados_coletados || {};
      const hasEquipmentContext = !!sessionData.equipamento;

      const agendamentoKeywords =
        /\b(agendar|marcar|aceito|aceitar|quero\s+(agendar|marcar)|vamos\s+(agendar|marcar)|sim|ok|beleza|pode|vou\s+(agendar|marcar)|confirmo|fechado|fechou)\b/i;
      const isAgendamentoIntent = agendamentoKeywords.test(body || '');
      const isTimeSelection = !!(
        body &&
        /^\s*(?:op(?:ç|c)[aã]o\s*)?([123])(?:\s*[-.)]?\s*(?:manh[aã]|tarde|noite))?\s*$/i.test(
          (body as string).trim()
        )
      );

      const hasQuoteDelivered2 = !!(session as any)?.state?.orcamento_entregue;
      const acceptedPlain2 = hasExplicitAcceptance(body || '');
      const pendingTime2 = !!(session as any)?.state?.pending_time_selection;
      const acceptedPersisted2 = !!(session as any)?.state?.accepted_service;
      const collecting2 = !!(session as any)?.state?.collecting_personal_data;
      const likelyName = !!(
        body &&
        /^[A-Za-z\u00c0-\u00ff]{2,}(?:\s+[A-Za-z\u00c0-\u00ff]{2,}){1,}\s*$/.test(body.trim()) &&
        !/[\d@]/.test(body)
      );
      const looksLikePersonal = !!(
        body &&
        (/(nome|endere[c\u00e7]o|endere[\u00e7c]o|rua|avenida|av\.|r\.|cep|cpf|email|@|\b\d{5}-?\d{3}\b)/i.test(body) ||
          likelyName)
      );

      // Guardião universal: seleção de horário → agendamento
      try {
        if (isTimeSelection) {
          return await executeAIAgendamento(decision, session, body, from);
        }
      } catch {}

      if (
        collecting2 ||
        ((acceptedPersisted2 || hasQuoteDelivered2) &&
          !isTimeSelection &&
          !isAgendamentoIntent &&
          looksLikePersonal)
      ) {
        return await executeAIAgendamento(decision, session, body, from);
      }

      if (
        (pendingTime2 && (isTimeSelection || isAgendamentoIntent || acceptedPlain2)) ||
        (hasEquipmentContext &&
          (hasQuoteDelivered2 || acceptedPlain2) &&
          (isAgendamentoIntent || isTimeSelection))
      ) {
        return await executeAIAgendamento(decision, session, body, from);
      }

      if (hasExplicitAcceptance(body || '')) {
        if (hasEquipmentContext && hasQuoteDelivered2) {
          return await executeAIAgendamento(decision, session, body, from);
        }
        if (hasEquipmentContext && !hasQuoteDelivered2) {
          return 'Antes de agendarmos, vou te passar o valor e as possíveis causas para alinharmos. Pode me confirmar marca e um breve descritivo do defeito?';
        }
        return 'Vou transferir você para um de nossos especialistas. Um momento, por favor.';
      }

      // Guardião de ordem + prompts determinísticos
      try {
        const stOuter = ((session as any)?.state || {}) as any;
        const prev = (stOuter as any)?.dados_coletados || {};
        const de = ((decision as any)?.dados_extrair || {}) as any;
        let nowGuess: any = {};
        try {
          nowGuess = guessFunnelFields(String(body || '')) as any;
        } catch {}

        const lastQuoteRaw = (stOuter.last_quote || stOuter.lastQuote || stOuter.quote) as any;
        const prevEqFromQuote = String(lastQuoteRaw?.equipment || lastQuoteRaw?.equipamento || '').trim();
        const prevEq = prevEqFromQuote || String(prev.equipamento || '').trim();
        const nowEqDeclared = String(de.equipamento || nowGuess?.equipamento || '').trim();
        const eq = nowEqDeclared || String(prev.equipamento || '').trim() || prevEq;

        const equipSwitched =
          !!prevEq &&
          !!nowEqDeclared &&
          !isSameEquipmentFamily(String(nowEqDeclared), String(prevEq));

        // Critico: quando o usuário reintroduz/troca de equipamento, NÃO herdar marca/problema antigos
        // para evitar perguntas fora de ordem (ex.: micro-ondas pedindo problema antes da marca).
        const brand = equipSwitched
          ? String(de.marca || nowGuess?.marca || '').trim() || undefined
          : String(de.marca || prev.marca || nowGuess?.marca || '').trim() || undefined;
        const prob = equipSwitched
          ? String(de.problema || nowGuess?.problema || '').trim() || undefined
          : String(de.problema || prev.problema || nowGuess?.problema || '').trim() || undefined;

        // Se a mensagem atual descreve 2 itens, não repetir orçamento antigo nem pedir follow-ups
        // para apenas um item; deixe o executor de orçamento reprocessar a mensagem inteira.
        try {
          if (looksLikeMultiEquipMessage(body || '')) {
            return await executeAIOrcamento(decision, session, body);
          }
        } catch {}

        if (eq && prob && !hasExplicitAcceptance(body || '')) {
          return await executeAIOrcamento(decision, session, body);
        }
        if (eq && !brand) {
          try {
            const { getTemplates, renderTemplate } = await import('../botConfig.js');
            const tpls = await getTemplates();
            const askBrand = tpls.find((t: any) => t.key === 'ask-brand');
            if (askBrand?.content) return renderTemplate(askBrand.content, { equipamento: String(eq) });
            return `Certo! Qual é a marca do seu ${eq}?`;
          } catch {
            return `Certo! Qual é a marca do seu ${eq}?`;
          }
        }
        if (eq && brand && !prob) {
          try {
            const { getTemplates, renderTemplate } = await import('../botConfig.js');
            const tpls = await getTemplates();
            const askProblem = tpls.find((t: any) => t.key === 'ask-problem');
            if (askProblem?.content)
              return renderTemplate(askProblem.content, {
                equipamento: String(eq),
                marca: brand ? String(brand) : '',
              });
            const brandTxt = brand ? ` da marca ${brand}` : '';
            return `Olá! Poderia me informar qual é o problema que você está enfrentando com seu ${eq}${brandTxt}?`;
          } catch {
            const brandTxt = brand ? ` da marca ${brand}` : '';
            return `Olá! Poderia me informar qual é o problema que você está enfrentando com seu ${eq}${brandTxt}?`;
          }
        }

        // Se já entregamos orçamento, “quanto fica?” deve repetir o último orçamento
        // (evita cair em resposta genérica/off-topic e mantém funil estável).
        try {
          const st = ((session as any)?.state || {}) as any;
          const msg = String(body || '').toLowerCase();
          const asksPrice = /\b(quanto|pre[cç]o|preco|valor|custa|or[cç]amento|orcamento)\b/i.test(msg);

          // Se o cliente descreveu 2 itens (mesmo pedindo “quanto fica/orçamento”), reprocessar
          // ao invés de repetir um orçamento antigo de 1 item.
          try {
            if (asksPrice && looksLikeMultiEquipMessage(body || '')) {
              return await executeAIOrcamento(decision, session, body);
            }
          } catch {}

          // Multi-equip: repetir em 2 blocos quando houver last_quotes
          try {
            const arr = st.last_quotes;
            if (asksPrice && Array.isArray(arr) && arr.length >= 2) {
              const q1: any = arr[0];
              const q2: any = arr[1];
              const dc = (st.dados_coletados || {}) as any;

              const fmt = (q: any, idx: 1 | 2) => {
                const equipment =
                  String(q?.equipment || (idx === 1 ? dc.equipamento : dc.equipamento_2) || '').trim() ||
                  'equipamento';
                const stype = String(q?.service_type || (idx === 1 ? dc.tipo_atendimento_1 : dc.tipo_atendimento_2) || '').toLowerCase();
                const value = Number(q?.value ?? q?.total ?? q?.price ?? 0);

                if (/coleta/.test(stype) && /diagn/.test(stype)) {
                  return `Para o seu ${equipment} — coleta para diagnóstico: diagnóstico R$ 350 (desconta do conserto se aprovar; abatemos 100%).`;
                }
                const policy = /coleta/.test(stype) && /conserto/.test(stype)
                  ? 'coleta + conserto'
                  : /domic/.test(stype)
                    ? 'visita técnica no local'
                    : '';
                const policyTxt = policy ? ` — ${policy}` : '';
                return Number.isFinite(value) && value > 0
                  ? `Para o seu ${equipment}${policyTxt}: valor do atendimento R$ ${value}.`
                  : `Para o seu ${equipment}${policyTxt}: posso te passar o valor certinho se me confirmar marca e o defeito.`;
              };

              const t1 = fmt(q1, 1);
              const t2 = fmt(q2, 2);
              return `${t1}\n\n${t2}\n\nQuer que eu já veja datas pra agendar?`;
            }
          } catch {}

          const quoteRaw = st.last_quote || st.lastQuote || st.quote;
          const quoteText = (() => {
            if (typeof quoteRaw === 'string') return quoteRaw.trim();
            if (!quoteRaw || typeof quoteRaw !== 'object') return '';
            const value = Number((quoteRaw as any).value ?? (quoteRaw as any).total ?? (quoteRaw as any).price ?? 0);
            if (!Number.isFinite(value) || value <= 0) return '';

            const dc = (st.dados_coletados || {}) as any;
            const equipment = String((quoteRaw as any).equipment || dc.equipamento || st.equipamento || '').trim() || 'equipamento';
            const stype = String((quoteRaw as any).service_type || (quoteRaw as any).serviceType || dc.tipo_atendimento_1 || '').toLowerCase();
            const eqLower = equipment.toLowerCase();
            const policy = /coifa|depurador|exaustor/.test(eqLower)
              ? 'visita diagnóstica no local'
              : /coleta/.test(stype) && /conserto/.test(stype)
                ? 'coleta + conserto'
                : /coleta/.test(stype) && /diagn/.test(stype)
                  ? 'diagnóstico R$ 350 (desconta do conserto se aprovar; abatemos 100%)'
                  : /domic/.test(stype)
                    ? 'visita técnica no local'
                    : '';

            const policyTxt = policy ? ` — ${policy}` : '';
            return `Para o seu ${equipment}${policyTxt}: valor do atendimento R$ ${value}.`;
          })();
          const hasQuote = !!quoteText || !!st.orcamento_entregue;
          if (asksPrice && hasQuote && quoteText) {
            return `${quoteText}\n\nQuer que eu já veja datas pra agendar?`;
          }
        } catch {}

        // Fora de escopo/tópico
        try {
          // Quando o cliente quer “conversar”/perguntar algo fora do funil,
          // responda humanizadamente (OpenAI) e reconduza com 1 pergunta do funil.
          // Importante: em testes, ou quando LLM_FAKE_JSON está sendo usado para forçar decisões,
          // não chamar chatComplete aqui para não devolver JSON pro cliente.
          const fake = String(process.env.LLM_FAKE_JSON || '').trim();
          const fakeLooksLikeJson = !!fake && (fake.startsWith('{') || fake.startsWith('['));

          const prev = (session as any)?.state?.dados_coletados || {};
          const eq = (decision as any)?.dados_extrair?.equipamento || prev.equipamento;
          const brand = (decision as any)?.dados_extrair?.marca || prev.marca;
          const probRaw =
            (decision as any)?.dados_extrair?.problema || prev.problema || prev.descricao_problema;

          const looksLikeProblemText = (s: string) =>
            /(n[aã]o|nao|parou|vaza|vazando|quebrou|defeito|falha|n[aã]o liga|nao liga|n[aã]o esquenta|nao esquenta|faz(endo)? barulho|cheiro|chama|porta|gira|fa[ií]sca|faisca)/i.test(
              String(s || '')
            );

          // Evitar tratar coisas como "gás"/"4 bocas" como se fosse "problema".
          const prob = probRaw && looksLikeProblemText(String(probRaw)) ? probRaw : null;

          const serviceHint = (() => {
            const equipment = String(eq || '').trim();
            if (!equipment) return '';
            // Fallback simples e determinístico (evita depender de policies em paths de exceção)
            const lower = equipment.toLowerCase();
            const fallback = (() => {
              if (
                lower.includes('lavadora') ||
                lower.includes('maquina de lavar') ||
                lower.includes('máquina de lavar') ||
                (lower.includes('maquina') && lower.includes('lavar')) ||
                (lower.includes('máquina') && lower.includes('lavar'))
              )
                return 'coleta diagnóstico';
              if (lower.includes('secadora')) return 'coleta diagnóstico';
              if (lower.includes('geladeira') || lower.includes('refrigerador') || lower.includes('freezer'))
                return 'coleta diagnóstico';
              return '';
            })();

            try {
              const preferred = getPreferredServicesForEquipment([], equipment);
              if (preferred.includes('coleta_diagnostico')) return 'coleta diagnóstico';
              if (preferred.includes('coleta_conserto')) return 'coleta + conserto';
              if (preferred.includes('em_domicilio')) return 'visita técnica no local';
              return fallback;
            } catch {
              return fallback;
            }
          })();

          const nextQuestion = !eq
            ? 'Pra eu te ajudar direitinho: qual é o equipamento (fogão, cooktop, forno, micro-ondas etc.)?'
            : !brand
              ? `Qual é a marca do seu ${String(eq)}?`
              : !prob
                ? `E qual é o problema que está acontecendo com seu ${String(eq)}${brand ? ` ${String(brand)}` : ''}?`
                : String(eq).toLowerCase().includes('lavadora')
                  ? 'Perfeito — na coleta diagnóstico, quer que eu te passe os valores e já veja datas pra agendar?'
                  : serviceHint
                    ? `Perfeito — na ${serviceHint}, quer que eu te passe os valores e já veja datas pra agendar?`
                    : 'Perfeito — quer que eu te passe os valores (incluindo coleta diagnóstico quando aplicável) e já veja datas pra agendar?';

          // Se o usuário respondeu com aceite (ex.: "sim") nesse momento de recondução,
          // não repetir a mesma pergunta — avance para o orçamento/agendamento.
          try {
            const accepted = hasExplicitAcceptance(body || '');
            if (accepted) {
              const st = ((session as any)?.state || {}) as any;
              const hasQuoteDelivered = !!st.orcamento_entregue;
              const hasQuoteObj = !!(st.last_quote || st.lastQuote || st.quote);
              if (hasQuoteDelivered || hasQuoteObj) {
                return await executeAIAgendamento(
                  { intent: 'agendamento_servico', acao_principal: 'coletar_dados', dados_extrair: {} },
                  session,
                  body,
                  from
                );
              }

              // Forçar execução do orçamento para gerar `last_quote`/`orcamento_entregue`.
              const forced: any = {
                intent: 'orcamento_equipamento',
                acao_principal: 'gerar_orcamento',
                blocos_relevantes: (decision as any)?.blocos_relevantes || [],
                dados_extrair: { ...(decision as any)?.dados_extrair },
                resposta_sugerida: (decision as any)?.resposta_sugerida || '',
              };
              return await executeAIOrcamento(forced, session, body);
            }
          } catch {}

          if (!fakeLooksLikeJson && process.env.NODE_ENV !== 'test') {
            try {
              const bot = await getActiveBot();
              const llm = (bot as any)?.llm || {};
              const provider = (llm.provider || 'openai') as any;
              const model =
                provider === 'anthropic'
                  ? llm.model || process.env.LLM_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
                  : llm.model || process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini';

              const system =
                buildSystemPrompt((bot as any)?.personality?.systemPrompt, undefined) +
                '\n\n' +
                'Instruções (conversa + recondução):\n' +
                '- Responda a mensagem do usuário de forma humana e breve (1–3 frases).\n' +
                '- Não invente valores, prazos, garantias ou políticas.\n' +
                '- Não peça dados pessoais.\n' +
                '- Em seguida, faça UMA pergunta para retomar o atendimento (funil).';

              const response = await chatComplete(
                { provider, model, temperature: llm.temperature ?? 0.7, maxTokens: 260 },
                [
                  { role: 'system', content: system },
                  { role: 'user', content: String(body || '') },
                ]
              );

              const base = String(response || '').trim();
              if (!base) return nextQuestion;

              // Se o modelo já reconduziu, não duplicar.
              if (/qual\s+(e|é)\s+o\s+equipamento|qual\s+(e|é)\s+a\s+marca|qual\s+(e|é)\s+o\s+problema|me\s+diga\s+qual\s+(e|é)\s+o\s+equipamento/i.test(base)) {
                return base;
              }
              return `${base}\n\n${nextQuestion}`;
            } catch {
              // fallback determinístico abaixo
            }
          }

          const { getTemplates, renderTemplate } = await import('../botConfig.js');
          const tpls = await getTemplates();
          const offTopic = tpls.find((t: any) => t.key === 'off_topic');
          return offTopic?.content
            ? renderTemplate(offTopic.content, {})
            : decision.resposta_sugerida || 'Posso te ajudar com orçamento, agendamento ou status. Qual prefere?';
        } catch {
          return decision.resposta_sugerida || 'Posso te ajudar com orçamento, agendamento ou status. Qual prefere?';
        }
      } catch {
        return decision.resposta_sugerida || 'Preciso de mais informações. Pode me ajudar?';
      }
    },

    responder_informacao: async () => {
      try {
        const st = ((session as any)?.state || {}) as any;
        const msg = String(body || '').toLowerCase();
        const asksPrice = /\b(quanto|pre[cç]o|preco|valor|custa|or[cç]amento|orcamento)\b/i.test(msg);
        const quoteRaw = st.last_quote || st.lastQuote || st.quote;
        const quoteText = (() => {
          if (typeof quoteRaw === 'string') return quoteRaw.trim();
          if (!quoteRaw || typeof quoteRaw !== 'object') return '';
          const value = Number((quoteRaw as any).value ?? (quoteRaw as any).total ?? (quoteRaw as any).price ?? 0);
          if (!Number.isFinite(value) || value <= 0) return '';

          const dc = (st.dados_coletados || {}) as any;
          const equipment = String((quoteRaw as any).equipment || dc.equipamento || st.equipamento || '').trim() || 'equipamento';
          const stype = String((quoteRaw as any).service_type || (quoteRaw as any).serviceType || dc.tipo_atendimento_1 || '').toLowerCase();
          const eqLower = equipment.toLowerCase();
          const policy = /coifa|depurador|exaustor/.test(eqLower)
            ? 'visita diagnóstica no local'
            : /coleta/.test(stype) && /conserto/.test(stype)
              ? 'coleta + conserto'
              : /coleta/.test(stype) && /diagn/.test(stype)
                  ? 'coleta diagnóstico (coletamos, diagnosticamos)'
                : /domic/.test(stype)
                  ? 'visita técnica no local'
                  : '';

          const policyTxt = policy ? ` — ${policy}` : '';
          return `Para o seu ${equipment}${policyTxt}: valor do atendimento R$ ${value}.`;
        })();
        if (asksPrice && quoteText) {
          return `${quoteText}\n\nQuer que eu já veja datas pra agendar?`;
        }
      } catch {}
      return await executeAIInformacao(decision, allBlocks);
    },

    agendar_servico: async () => {
      // Evitar chamadas externas no ambiente de teste quando orçamento não foi entregue ainda
      // Porém, se já houve aceite explícito ou estamos coletando dados, permitir seguir
      // Também permitir quando já temos dados essenciais (equipamento, marca, problema) ou quando a mensagem já contém horário/data
      {
        const st = ((session as any)?.state || {}) as any;
        const hasAcceptance = !!(st.accepted_service || st.collecting_personal_data);
        const sd = (st.dados_coletados || {}) as any;
        const hasCoreData = !!(
          (sd.equipamento || st.equipamento) && (sd.marca || st.marca) && (sd.problema || st.problema)
        );
        const text = String(body || '').toLowerCase();
        const looksLikeTime = /(amanh[ãa]|hoje|segunda|ter[çc]a|quarta|quinta|sexta|s[aá]bado|domingo|\b\d{1,2}[:h]\d{0,2}\b|\b\d{1,2}\s*h\b)/i.test(
          text
        );
        if (!st.orcamento_entregue && !hasAcceptance && !hasCoreData && !looksLikeTime) {
          return 'Antes de agendarmos, vou te passar o valor e as possíveis causas para alinharmos. Pode me confirmar a marca e um breve descritivo do defeito?';
        }
      }
      return await executeAIAgendamento(decision, session, body, from);
    },

    transferir_humano: async () =>
      'Vou transferir você para um de nossos especialistas. Um momento, por favor.',
  };
}
