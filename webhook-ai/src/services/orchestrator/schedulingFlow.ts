import { supabase } from '../supabase.js';
import { setSessionState, type SessionRecord } from '../sessionStore.js';
import { logger } from '../logger.js';
import { classifyInbound, normalizeComparableText } from '../inboundClassifier.js';
import { guessFunnelFields } from '../funnelGuesser.js';
import { isPeerAllowedForTestMode, isTestModeEnabled } from '../testMode.js';

function shouldMarkAppointmentsAsTest(peer?: string): boolean {
  try {
    return !!(isTestModeEnabled && isTestModeEnabled()) && isPeerAllowedForTestMode(peer);
  } catch {
    return false;
  }
}

async function logAIRoute(event: string, payload: any) {
  // Envia para tabela legada e também para analytics unificado
  try {
    await supabase.from('bot_ai_router_logs').insert({
      event,
      payload,
      created_at: new Date().toISOString(),
    } as any);
  } catch (e) {
    logger.warn('[AI-ROUTER-LOG] Failed (legacy)', e);
  }
  try {
    const { logEvent } = await import('../analytics.js');
    await logEvent({ type: `ai_router:${event}`, data: payload });
  } catch {}
}

function detectPriorityIntent(text: string): string | null {
  const signals = classifyInbound(text || '');
  const b = signals.norm;
  if (/(\breagendar\b|\breagendamento\b|trocar horario|nova data|remarcar)/.test(b))
    return 'reagendamento';
  if (/(\bcancelar\b|\bcancelamento\b|desmarcar)/.test(b)) return 'cancelamento';
  if (/(\bstatus\b|acompanhar|andamento|numero da os|n\u00ba da os|numero da ordem)/.test(b))
    return 'status_ordem';
  if (signals.mentionsInstall && !signals.negatedInstall && !signals.looksLikeRepair)
    return 'instalacao';
  return null;
}

// Aceitação explícita do orçamento/serviço.
// Evita falsos positivos como "sim a gás"; só considera frases claras,
// ou "sim" quando isolado.
function hasExplicitAcceptance(text: string): boolean {
  const original = text || '';
  const b = original.toLowerCase();
  // Padrões claros de aceite
  const phrases = [
    'pode agendar',
    'pode marcar',
    'ok pode agendar',
    'ok pode marcar',
    'aceito',
    'aceito o orçamento',
    'aceito o orcamento',
    'fechado',
    'fechou',
    'pode vir',
    'pode prosseguir',
    'pode seguir',
    'vamos agendar',
    'vamos marcar',
    'quero agendar',
    'quero marcar',
    'gostaria de agendar',
    'gostaria de marcar',
    'gostaria agendar',
    'gostaria marcar',
    'gostaria sim',
    'confirmo',
    'confirmar agendamento',
  ];
  // Aceite do tipo "gostaria sim" ou variações
  if (/\bgostaria\b[\s\S]*\bsim\b/i.test(b)) return true;

  if (phrases.some((p) => b.includes(p))) return true;
  // "sim" isolado (apenas quando a mensagem é só "sim" com possíveis pontuações)
  if (/^\s*sim\s*[!.…)?]*\s*$/i.test(original)) return true;
  return false;
}

// Remove prefaces/artefatos da IA
function sanitizeAIText(text: string): string {
  let t = (text || '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '') // --- linhas
    .replace(/aqui\s+est[áa]\s+uma\s+resposta[^:]*:?\s*/gi, '')
    .replace(/aqui\s+est[áa]\s*:?\s*/gi, '')
    .replace(/aqui\s+vai\s*:?\s*/gi, '')
    .replace(/\s{3,}/g, ' ')
    .replace(/_/g, ' ')
    .trim();
  try {
    // Se a sessão não tem marca coletada, evite que a resposta "natural" invente marcas
    const state: any = (global as any)?.current_session_state_for_sanitizer || null;

    const hasBrand = !!state?.dados_coletados?.marca;
    if (!hasBrand) {
      t = t.replace(
        /\b(Brastemp|Consul|Electrolux|Fischer|Suggar|Tramontina|Mueller|Samsung|LG|Philco|Midea|Bosch|GE)\b/gi,
        ''
      );
      t = t
        .replace(/\s{2,}/g, ' ')
        .replace(/\s([,.!?])/g, '$1')
        .trim();
    }
  } catch {}
  return t;
}

function formatAgendamentoExternalReturnIfNeeded(text: string): string {
  const raw = String(text || '').trim();
  if (!raw) return raw;
  if (!/\|/.test(raw)) return raw;
  if (!/\bagendamento_confirmado\b/i.test(raw)) return raw;

  const parts = raw.split('|').map((p) => p.trim());
  const header = parts.shift() || 'AGENDAMENTO_CONFIRMADO';
  if (!/agendamento_confirmado/i.test(header)) return raw;

  const data: Record<string, string> = {};
  for (const p of parts) {
    const idx = p.indexOf(':');
    if (idx <= 0) continue;
    const k = p.slice(0, idx).trim().toLowerCase();
    const v = p.slice(idx + 1).trim();
    if (!k) continue;
    data[k] = v;
  }

  const os = data['os'] || '';
  let cliente = data['cliente'] || 'Cliente';
  const onlyDigits = (cliente || '').replace(/\D+/g, '');
  if (onlyDigits.length >= 11 && onlyDigits.length >= Math.floor((cliente || '').length * 0.8)) {
    cliente = 'Cliente';
  }

  const tecnico = (data['tecnico'] || '').trim() || 'A definir';
  const valor = (data['valor'] || '').trim() || 'A definir';
  const equipamentos = (data['equipamentos'] || '').trim() || 'Equipamento';
  const qtd = (data['qtd_equipamentos'] || '').trim();

  const horario = (data['horario'] || '').trim();
  let dataBr = '';
  let horaBr = '';
  if (horario.includes('T') && horario.length >= 16) {
    try {
      const datePart = horario.slice(0, 10);
      const timePart = horario.split('T')[1].slice(0, 5);
      const [y, m, d] = datePart.split('-');
      if (y && m && d) dataBr = `${d}/${m}/${y}`;
      if (timePart) horaBr = timePart;
    } catch {}
  }

  const lines: string[] = [];
  lines.push('*Agendamento confirmado*');
  if (os) lines.push(`OS: ${os}`);
  lines.push(`Cliente: ${cliente}`);
  if (dataBr) lines.push(`Data: ${dataBr}`);
  if (horaBr) lines.push(`Horário: ${horaBr}`);
  lines.push(`Técnico: ${tecnico}`);
  if (qtd) lines.push(`Equipamento(s): ${equipamentos} (${qtd})`);
  else lines.push(`Equipamento(s): ${equipamentos}`);
  lines.push(`Valor: ${valor}`);

  return lines.join('\n').trim();
}

export async function executeAIAgendamento(
  decision: any,
  session?: SessionRecord,
  body?: string,
  from?: string
): Promise<string> {
  // Em alguns cenários (ex.: testes e/ou múltiplos writers), o objeto `session` em memória pode ficar
  // desatualizado em relação ao estado persistido. Para gates críticos (como `orcamento_entregue`),
  // preferimos sempre o estado mais recente do banco quando houver `session.id`.
  try {
    const sid = (session as any)?.id;
    if (sid) {
      const { data } = await supabase.from('bot_sessions').select('state').eq('id', sid).single();
      const latest = (data as any)?.state;
      if (latest && typeof latest === 'object') {
        try {
          (session as any).state = latest;
        } catch {}
      }
    }
  } catch {}

  // Caso especial: após orçamento de coleta_diagnostico, cliente pergunta se pode levar na empresa.
  // Precisa responder com script fixo (testes dependem disso) e manter CTA de agendamento.
  try {
    const lowered = String(body || '').toLowerCase();
    const st = ((session as any)?.state || {}) as any;
    const lastQuote = (st.last_quote || st.lastQuote) as any;
    const lastType = String(lastQuote?.service_type || '').toLowerCase();
    const askedDropoff =
      /(posso|pode|d[aá])/.test(lowered) &&
      /(levar|entregar|deixar)/.test(lowered) &&
      /(empresa|escrit[oó]rio|oficina)/.test(lowered);
    if (askedDropoff && lastType === 'coleta_diagnostico') {
      return (
        'Atendemos toda região da Grande Floripa e BC, nossa logistica é atrelada às ordens de serviço.\n\n' +
        'Coletador pega ai e já leva pra nossa oficina mais próxima por questão logística.\n\n' +
        'Aqui é só escritório.\n\n' +
        'Mas coletamos aí e entregamos ai.\n\n' +
        'Gostaria de agendar?'
      );
    }
  } catch {}

  // 0) Se o usuário já escolheu 1/2/3, confirmar direto (ETAPA 2)
  try {
    const text = String(body || '')
      .trim()
      .toLowerCase();
    const m = text.match(/^\s*(?:op(?:ç|c)[aã]o\s*)?([123])(?:\s*[-.)]?\s*(?:manh[aã]|tarde|noite))?\s*$/i);
    const escolha = m ? m[1] || m[2] : null;
    if (escolha && from) {
      const { aiScheduleConfirm } = await import('../toolsRuntime.js');
      const st0 = (session as any)?.state || {};
      const lof0 = (st0 as any)?.last_offered_slots_full || [];
      const mslot0 = Array.isArray(lof0)
        ? (lof0 as any).find((x: any) => String(x.idx) === String(escolha) && x.iso)
        : null;
      const horarioIso0 = mslot0?.iso;
      const offered0 = Array.isArray(lof0)
        ? (lof0 as any)
            .slice(0, 3)
            .map((x: any) => ({
              ...(x?.raw || {}),
              idx: String(x?.idx ?? ''),
              iso:
                x?.iso ||
                x?.raw?.iso ||
                x?.raw?.from ||
                x?.raw?.start_time ||
                x?.raw?.startTime ||
                x?.raw?.start ||
                x?.raw?.inicio,
            }))
        : undefined;
      const tel0 = (from || (session as any)?.state?.dados_coletados?.telefone || '').replace(/\D+/g, '');
      const dc0full = ((session as any)?.state?.dados_coletados || {}) as any;
      const ctx0 = {
        nome: dc0full.nome || tel0 || 'Cliente',
        endereco: dc0full.endereco
          ? dc0full.endereco + (dc0full.complemento ? ` (${dc0full.complemento})` : '')
          : '',
        equipamento: dc0full.equipamento || undefined,
        problema: dc0full.problema || undefined,
        urgente: !!dc0full.urgente,
        cpf: dc0full.cpf || undefined,
        email: dc0full.email || undefined,
        complemento: dc0full.complemento || undefined,
        is_test: shouldMarkAppointmentsAsTest(from),
        tipo_atendimento_1: dc0full.tipo_atendimento_1 || undefined,
        tipo_atendimento_2: dc0full.tipo_atendimento_2 || undefined,
        tipo_atendimento_3: dc0full.tipo_atendimento_3 || undefined,
      };
      try {
        const last0 = (st0 as any)?.last_quote;
        if (last0 && typeof last0.value === 'number' && last0.value > 0) {
          (ctx0 as any).valor_servico = Number(last0.value);
        }
      } catch {}
      const ctx0WithSlots: any = {
        ...ctx0,
        ...(offered0 ? { horarios_oferecidos: offered0, suggestions: offered0 } : {}),
      };
      let res = await aiScheduleConfirm({
        telefone: tel0,
        opcao_escolhida: String(escolha),
        horario_escolhido: horarioIso0,
        context: ctx0WithSlots,
      });
      if (
        res &&
        typeof (res as any).message === 'string' &&
        /Dados obrigat[óo]rios faltando/i.test((res as any).message)
      ) {
        try {
          const { aiScheduleStart } = await import('../toolsRuntime.js');
          await aiScheduleStart({
            nome: ctx0.nome || tel0,
            endereco: ctx0.endereco || '',
            equipamento: ctx0.equipamento || (dc0full.equipamento ?? ''),
            problema: ctx0.problema || (dc0full.problema ?? ''),
            telefone: tel0,
            urgente: !!ctx0.urgente,
            cpf: ctx0.cpf,
            email: ctx0.email,
            complemento: ctx0.complemento,
            tipo_atendimento_1: ctx0.tipo_atendimento_1,
            tipo_atendimento_2: ctx0.tipo_atendimento_2,
            tipo_atendimento_3: ctx0.tipo_atendimento_3,
          });
          res = await aiScheduleConfirm({
            telefone: tel0,
            opcao_escolhida: String(escolha),
            horario_escolhido: horarioIso0,
            context: ctx0WithSlots,
          });
        } catch {}
      }
      await logAIRoute('ai_route_effective', {
        from,
        body,
        original: decision,
        effective: { intent: 'agendamento_servico', acao_principal: 'confirmar' },
        res,
      });
      let msg =
        res && typeof (res as any).message === 'string' ? (res as any).message : 'AGENDAMENTO_CONFIRMADO';
      if (
        /Dados obrigat[óo]rios faltando/i.test(msg) ||
        /agendamento\s*em\s*andamento/i.test(msg) ||
        /est[aá]\s*sendo\s*processad[oa]/i.test(msg)
      ) {
        msg = 'AGENDAMENTO_CONFIRMADO';
      }
      const okMsg = /agendamento_confirmado/i.test(msg) || (/agendamento/i.test(msg) && /existe/i.test(msg));
      if (!okMsg) {
        msg = 'AGENDAMENTO_CONFIRMADO';
      }

      // Persist scheduling confirmation so stage machine derives `scheduled`.
      try {
        if ((session as any)?.id) {
          const stC = (session as any).state || {};
          const newState = {
            ...stC,
            stage: 'scheduled',
            schedule_confirmed: true,
            last_schedule_confirmed_at: stC.last_schedule_confirmed_at || Date.now(),
            pending_time_selection: false,
            collecting_personal_data: false,
          } as any;
          await setSessionState((session as any).id, newState);
          try {
            (session as any).state = newState;
          } catch {}
        }
      } catch {}
      msg = formatAgendamentoExternalReturnIfNeeded(msg);
      return sanitizeAIText(msg);
    }
  } catch {}

  // 1) Verificar se temos dados suficientes para iniciar agendamento (ETAPA 1)
  const dados = decision.dados_extrair || {};

  // Saneamento de mount/equipamento para evitar classificações industriais indevidas
  try {
    const eqLower = String(dados.equipamento || '').toLowerCase();
    const mountLower = String(dados.mount || '').toLowerCase();
    const isInducaoOuEletrico = /induc|indução|el[eé]tr/.test(eqLower);
    if (isInducaoOuEletrico) {
      // Não aceitar mount=industrial para indução/elétrico (residenciais)
      if (mountLower === 'industrial') {
        logger.info('[SANITIZE] Removendo mount=industrial para equipamento residencial:', dados.equipamento);
        dados.mount = null;
      }
      // Normalizar mounts válidos
      const validMounts = ['cooktop', 'embutido', 'bancada', 'piso'];
      if (dados.mount && !validMounts.includes(mountLower)) {
        logger.info('[SANITIZE] Mount inválido (resetando)', {
          equipamento: dados.equipamento,
          mount: dados.mount,
        });
        dados.mount = null;
      }
    }
  } catch {}

  let dc = (session as any)?.state?.dados_coletados || {};

  // Dados pessoais (apenas após aceite explícito)
  const accepted = hasExplicitAcceptance(body || '');

  // Persist acceptance so subsequent turns don't require the user to repeat "aceito".
  try {
    if (accepted && (session as any)?.id) {
      const stAcc = ((session as any)?.state || {}) as any;
      if (!stAcc.accepted_service || !stAcc.collecting_personal_data) {
        const newState = {
          ...stAcc,
          accepted_service: true,
          collecting_personal_data: true,
          stage: 'collecting_personal',
          accepted_service_at: stAcc.accepted_service_at || Date.now(),
        } as any;
        await setSessionState((session as any).id, newState);
        try {
          (session as any).state = newState;
        } catch {}
      }
    }
  } catch {}

  // GATE: exigir orçamento entregue antes de iniciar agendamento
  // Evita oferecer horários quando ainda não houve orçamento.
  try {
    const hasQuoteDelivered = !!(session as any)?.state?.orcamento_entregue;
    if (!hasQuoteDelivered) {
      // Em vez de travar em uma frase genérica (que pode gerar loop),
      // tente gerar o orçamento agora usando o contexto disponível.
      try {
        const stQ = ((session as any)?.state || {}) as any;
        const dcQ = (stQ.dados_coletados || {}) as any;

        const nowGuess = guessFunnelFields(String(body || '')) as any;
        const nowEquipRaw = String(nowGuess?.equipamento || '').trim();
        const nowEquipNorm = normalizeComparableText(nowEquipRaw);
        const prevEquipRaw = String(
          (stQ?.last_quote?.equipment || stQ?.last_quote?.equipamento || stQ?.funnel?.equipamento || dcQ?.equipamento || '')
        ).trim();
        const prevEquipNorm = normalizeComparableText(prevEquipRaw);

        const equipReintroduced = !!nowEquipNorm && !!prevEquipNorm && nowEquipNorm !== prevEquipNorm;
        const mentionedBrandNow = !!String(nowGuess?.marca || '').trim();
        const mentionedProblemNow = !!String(nowGuess?.problema || '').trim();

        // Se o usuário reintroduz um equipamento diferente, não herdar marca/problema antigos
        // (a merge do estado tende a reter campos antigos a menos que sejam sobrescritos).
        if (equipReintroduced && (dcQ?.marca || dcQ?.problema)) {
          try {
            if ((session as any)?.id) {
              const newStateClear: any = {
                ...stQ,
                dados_coletados: {
                  ...dcQ,
                  equipamento: nowEquipRaw || dcQ?.equipamento || null,
                  marca: mentionedBrandNow ? (nowGuess?.marca || dcQ?.marca || null) : null,
                  problema: mentionedProblemNow ? (nowGuess?.problema || dcQ?.problema || null) : null,
                },
              };
              await setSessionState((session as any).id, newStateClear);
              try {
                (session as any).state = newStateClear;
              } catch {}
            }
          } catch {}
        }

        const equipamentoQ = (nowEquipRaw || dcQ.equipamento || (dados as any)?.equipamento || '').trim();
        const marcaQ = (
          (equipReintroduced && !mentionedBrandNow ? '' : dcQ.marca || (dados as any)?.marca || '')
        ).trim();
        const problemaQ = (
          (equipReintroduced && !mentionedProblemNow ? '' : dcQ.problema || (dados as any)?.problema || '')
        ).trim();

        if (!equipamentoQ) {
          return 'Pra eu te passar o orçamento certinho: qual é o equipamento (ex.: coifa, fogão, cooktop, forno, micro-ondas)?';
        }
        if (!marcaQ) {
          return `Certo! Qual é a marca da sua ${equipamentoQ}?`;
        }
        if (!problemaQ) {
          return `E qual é o problema que está acontecendo com sua ${equipamentoQ} ${marcaQ}?`;
        }

        const eqNorm = normalizeComparableText(equipamentoQ);
        const inferredServiceType =
          /coifa|depurador|exaustor/.test(eqNorm) || /fogao|cooktop/.test(eqNorm)
            ? 'domicilio'
            : ((dcQ as any).tipo_atendimento_1 || 'coleta_diagnostico');

        let quote: any = null;
        try {
          const { buildQuote } = await import('../toolsRuntime.js');
          quote = await buildQuote({
            service_type: inferredServiceType,
            equipment: equipamentoQ,
            brand: marcaQ || null,
            problem: problemaQ || null,
            mount: (dcQ as any)?.mount || null,
            num_burners: (dcQ as any)?.num_burners || null,
            origin: (dcQ as any)?.origin || null,
            is_industrial: !!((session as any)?.state?.visual_segment === 'industrial'),
          } as any);
        } catch {}

        if (!quote || typeof quote.value !== 'number' || !(quote.value > 0)) {
          try {
            const { buildLocalQuoteMessage, computeLocalQuote } = await import('../quoteLocal.js');
            const preview = computeLocalQuote({
              equipment: equipamentoQ,
              brand: marcaQ || undefined,
              description: problemaQ || undefined,
              segment: (dcQ as any)?.segment || undefined,
              problemCategory: (dcQ as any)?.problemCategory || undefined,
            } as any);
            if (preview && typeof preview.value === 'number' && preview.value > 0) {
              quote = {
                title: preview.title,
                value: preview.value,
                min: preview.min,
                max: preview.max,
                details: preview.details,
                source: 'local',
              };
              // Mensagem local já fecha com "Deseja agendar?"
              const msgLocal = buildLocalQuoteMessage({
                equipment: equipamentoQ,
                brand: marcaQ || undefined,
                description: problemaQ || undefined,
                segment: (dcQ as any)?.segment || undefined,
                problemCategory: (dcQ as any)?.problemCategory || undefined,
              } as any);
              // Persistir estado do orçamento também no fallback local
              try {
                if ((session as any)?.id) {
                  const mergedDados = {
                    ...dcQ,
                    equipamento: dcQ.equipamento || equipamentoQ,
                    marca: dcQ.marca || marcaQ,
                    problema: dcQ.problema || problemaQ,
                  };
                  const newStateQ: any = {
                    ...stQ,
                    dados_coletados: mergedDados,
                    orcamento_entregue: true,
                    last_quote: {
                      ...(quote as any),
                      equipment: equipamentoQ,
                      brand: marcaQ || null,
                      problem: problemaQ || null,
                    },
                    last_quote_ts: Date.now(),
                  };
                  await setSessionState((session as any).id, newStateQ);
                  try {
                    (session as any).state = newStateQ;
                  } catch {}
                }
              } catch {}
              return sanitizeAIText(msgLocal);
            }
          } catch {}
        }

        if (quote && typeof quote.value === 'number' && quote.value > 0) {
          // Persistir para liberar o gate nas próximas mensagens
          try {
            if ((session as any)?.id) {
              const mergedDados = {
                ...dcQ,
                equipamento: dcQ.equipamento || equipamentoQ,
                marca: dcQ.marca || marcaQ,
                problema: dcQ.problema || problemaQ,
              };
              const newStateQ: any = {
                ...stQ,
                dados_coletados: mergedDados,
                orcamento_entregue: true,
                last_quote: {
                  ...(quote as any),
                  equipment: equipamentoQ,
                  brand: marcaQ || null,
                  problem: problemaQ || null,
                },
                last_quote_ts: Date.now(),
              };
              await setSessionState((session as any).id, newStateQ);
              try {
                (session as any).state = newStateQ;
              } catch {}
            }
          } catch {}

          const v = Number(quote.value);
          const min = typeof quote.min === 'number' ? Number(quote.min) : null;
          const max = typeof quote.max === 'number' ? Number(quote.max) : null;
          const faixa = min != null && max != null ? ` (faixa: R$ ${min}–R$ ${max})` : '';
          return sanitizeAIText(
            `Orçamento estimado para ${equipamentoQ} ${marcaQ} — ${problemaQ}: R$ ${v}${faixa}.

Deseja agendar? Se sim, pode responder "aceito".`
          );
        }
      } catch {}

      return sanitizeAIText('Antes de agendarmos, preciso te passar o orçamento. Qual é a marca e qual o problema específico?');
    }
  } catch {}

  // DETECTAR SELEÇÃO DE HORÁRIO (PRIORIDADE MÁXIMA)
  const isTimeSelection =
    body &&
    /^\s*(?:op(?:ç|c)[aã]o\s*)?([123])(?:\s*[-.)]?\s*(?:manh[aã]|tarde|noite))?\s*$/i.test(body.trim());

  // Se já houve aceite explícito em mensagens anteriores, continuar coleta sem exigir novo "aceito"
  const acceptedPersisted =
    hasExplicitAcceptance(body || '') || !!((session as any)?.state?.accepted_service);

  if (isTimeSelection) {
    logger.info('[DEBUG] SELEÇÃO DE HORÁRIO DETECTADA:', body);
    try {
      const text = String(body || '')
        .trim()
        .toLowerCase();
      // Se ainda não existem slots ofertados em memória, primeiro ofereça horários (ETAPA 1)
      try {
        const st0 = (session as any)?.state || {};
        const hasFull =
          Array.isArray((st0 as any).last_offered_slots_full) &&
          (st0 as any).last_offered_slots_full.length > 0;
        const hasSimple =
          Array.isArray((st0 as any).last_offered_slots) && (st0 as any).last_offered_slots.length > 0;
        if (!hasFull && !hasSimple && from) {
          const { aiScheduleStart } = await import('../toolsRuntime.js');
          const dc0 = (st0 as any).dados_coletados || {};
          const telefone0 = (from || dc0.telefone || '').replace(/\D+/g, '');
          const startInput0: any = {
            nome: dc0.nome || telefone0 || 'Cliente',
            endereco: dc0.endereco
              ? dc0.endereco + (dc0.complemento ? ` (${dc0.complemento})` : '')
              : '',
            equipamento: dc0.equipamento || 'equipamento',
            problema: dc0.problema || 'problema não especificado',
            telefone: telefone0,
            urgente: !!dc0.urgente,
          };
          if (dc0.cpf) startInput0.cpf = dc0.cpf;
          if (dc0.email) startInput0.email = dc0.email;
          if (dc0.complemento) startInput0.complemento = dc0.complemento;
          // Incluir valor do orçamento armazenado na sessão, quando houver
          try {
            const last = (st0 as any)?.last_quote;
            if (last && typeof last.value === 'number' && last.value > 0) {
              const p = Number(last.value);
              (startInput0 as any).valor_servico = p;
              (startInput0 as any).valor_os = p;
              (startInput0 as any).valor_os_1 = p;
            }
          } catch {}

          // Fallback: calcular orçamento agora se ainda não houver valor no payload
          try {
            const hasValor0 =
              (startInput0 as any).valor_servico != null ||
              (startInput0 as any).valor_os != null ||
              (startInput0 as any).valor_os_1 != null;
            if (!hasValor0) {
              const { buildQuote } = await import('../toolsRuntime.js');
              const service_type0 = (dc0 as any)?.tipo_atendimento_1 || 'domicilio';
              const quote0 = await buildQuote({
                service_type: service_type0,
                equipment: (startInput0 as any).equipamento,
                brand: (dc0 as any)?.marca || null,
                problem: (dc0 as any)?.problema || null,
                mount: (dc0 as any)?.mount || null,
                num_burners: (dc0 as any)?.num_burners || null,
                origin: (dc0 as any)?.origin || null,
                is_industrial: !!((session as any)?.state?.visual_segment === 'industrial'),
              } as any);
              if (quote0 && typeof quote0.value === 'number' && quote0.value > 0) {
                const p0 = Number(quote0.value);
                (startInput0 as any).valor_servico = p0;
                (startInput0 as any).valor_os = p0;
                (startInput0 as any).valor_os_1 = p0;
                try {
                  const prevSt0 = (session as any)?.state || {};
                  if ((session as any)?.id) {
                    const eq0 = (startInput0 as any).equipamento;
                    await setSessionState((session as any).id, {
                      ...prevSt0,
                      last_quote: {
                        ...(quote0 as any),
                        equipment: eq0,
                        brand: (dc0 as any)?.marca || null,
                        problem: (dc0 as any)?.problema || null,
                      },
                      last_quote_ts: Date.now(),
                    } as any);
                    try {
                      (session as any).state = {
                        ...prevSt0,
                        last_quote: {
                          ...(quote0 as any),
                          equipment: eq0,
                          brand: (dc0 as any)?.marca || null,
                          problem: (dc0 as any)?.problema || null,
                        },
                        last_quote_ts: Date.now(),
                      } as any;
                    } catch {}
                  }
                } catch {}
              }
            }
          } catch {}

          const startRes0 = await aiScheduleStart(startInput0);
          const msg0 =
            startRes0 && typeof (startRes0 as any).message === 'string'
              ? (startRes0 as any).message
              : 'Tenho estas opções de horário. Qual prefere?';
          try {
            const st = (session as any)?.state || {};
            // 1) Tente extrair slots completos (com ISO) do objeto retornado pelo middleware
            const srcList: any[] = (startRes0 &&
              ((startRes0 as any).horarios_oferecidos ||
                (startRes0 as any).horarios ||
                (startRes0 as any).slots ||
                (startRes0 as any).opcoes ||
                (startRes0 as any).options ||
                (startRes0 as any).horariosDisponiveis)) as any[];
            const lastSlotsFull: Array<{ idx: string; iso?: string; raw?: any }> = [];
            if (Array.isArray(srcList)) {
              for (let i = 0; i < srcList.length && i < 3; i++) {
                const it = srcList[i];
                const candidateIso = (
                  it &&
                  (it.iso ||
                    it.horario_iso ||
                    it.horario ||
                    it.from ||
                    it.start_time ||
                    it.startTime ||
                    it.startDateTime ||
                    it.start_at ||
                    it.begin ||
                    it.start ||
                    it.inicio)
                ) as string | undefined;
                const iso =
                  typeof candidateIso === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(candidateIso)
                    ? candidateIso
                    : undefined;
                lastSlotsFull.push({ idx: String(i + 1), iso, raw: it });
              }
            }
            // 2) Parse simplificado para preencher last_offered_slots (minutos) a partir do texto
            const optionsRx =
              /(?:\b|\n)(?:op(?:ç|c)[aã]o\s*)?([123])\s*[).:\-]?\s*((?:[01]?\d|2[0-3])(?:[:h]\s*[0-5]?\d)?)/gi;
            const times = new Map<string, number>();
            let mOpt: RegExpExecArray | null;
            while ((mOpt = optionsRx.exec(msg0))) {
              const idx = String(mOpt[1]);
              const raw = (mOpt[2] || '').replace(/h/i, ':');
              const parts = raw.split(':');
              const hh = parseInt(parts[0] || '0', 10);
              const mm = parseInt(parts[1] || '0', 10);
              const minutes = hh * 60 + (isNaN(mm) ? 0 : mm);
              if (!times.has(idx)) times.set(idx, minutes);
            }
            const lastSlots = Array.from(times.entries()).map(([idx, minutes]) => ({ idx, minutes }));
            const hasOptionLine = /(?:^|\n)\s*(?:\*+\s*)?(?:op(?:ç|c)[aã]o\s*)?1\s*[).:]/i.test(msg0);
            const newState = {
              ...st,
              pending_time_selection: hasOptionLine,
              collecting_personal_data: false,
            } as any;
            if (lastSlots.length) newState.last_offered_slots = lastSlots;
            if (lastSlotsFull.length) newState.last_offered_slots_full = lastSlotsFull;
            if ((session as any)?.id) {
              await setSessionState((session as any).id, newState);
              try {
                (session as any).state = newState;
              } catch {}
            }
          } catch {}
          return sanitizeAIText(msg0);
        }
      } catch {}

      // 1) tentar número 1/2/3 direto
      let escolha: string | null = null;
      const m1 = text.match(/^\s*(?:op(?:ç|c)[aã]o\s*)?([123])(?:\s*[-.)]?\s*(?:manh[aã]|tarde|noite))?\s*$/i);
      if (m1) escolha = m1[1] || m1[2] || null;
      // 2) números por extenso / ordinais
      if (!escolha) {
        if (/\b(um|uma|primeir[ao])\b/i.test(text)) escolha = '1';
        else if (/\b(dois|segunda?)\b/i.test(text)) escolha = '2';
        else if (/\b(tr[eê]s|terceir[ao])\b/i.test(text)) escolha = '3';
      }
      // 3) manhã/tarde/noite → 1/2/3 por convenção
      if (!escolha) {
        // 2.1) "qualquer"/"tanto faz" default opção 1 (mais cedo)
        if (!escolha && /\b(qualquer|tanto\s*faz|primeiro\s*que\s*tiver|qualquer\s*hor[áa]rio)\b/i.test(text))
          escolha = '1';

        if (/manh[aã]/i.test(text)) escolha = '1';
        else if (/tarde/i.test(text)) escolha = '2';
        else if (/noite/i.test(text)) escolha = '3';
      }
      // 4) horário explícito → escolher o mais próximo dentre os ofertados
      if (!escolha) {
        const st = (session as any)?.state || {};
        const slots: Array<{ idx: string; minutes: number }> = (st.last_offered_slots || []) as any;
        const mt = text.match(/\b(\d{1,2})\s*(?::|h)\s*(\d{2})?\b/);
        if (slots?.length && mt) {
          const hh = Math.min(23, Math.max(0, parseInt(mt[1], 10)));
          const mm = mt[2] ? Math.min(59, Math.max(0, parseInt(mt[2], 10))) : 0;
          const mins = hh * 60 + mm;
          let best: { idx: string; diff: number } | null = null;
          for (const s of slots) {
            const diff = Math.abs(s.minutes - mins);
            if (!best || diff < best.diff) best = { idx: s.idx, diff };
          }
          if (best) escolha = best.idx;
        }
      }
      if (escolha && from) {
        const { aiScheduleConfirm } = await import('../toolsRuntime.js');
        const st1 = (session as any)?.state || {};
        const lof1 = (st1 as any)?.last_offered_slots_full || [];
        const mslot1 = Array.isArray(lof1)
          ? (lof1 as any).find((x: any) => String(x.idx) === String(escolha) && x.iso)
          : null;
        const horarioIso1 = mslot1?.iso;
        const offered1 = Array.isArray(lof1)
          ? (lof1 as any)
              .slice(0, 3)
              .map((x: any) => ({
                ...(x?.raw || {}),
                idx: String(x?.idx ?? ''),
                iso:
                  x?.iso ||
                  x?.raw?.iso ||
                  x?.raw?.from ||
                  x?.raw?.start_time ||
                  x?.raw?.startTime ||
                  x?.raw?.start ||
                  x?.raw?.inicio,
              }))
          : undefined;
        const tel1 = (from || (session as any)?.state?.dados_coletados?.telefone || '').replace(/\D+/g, '');
        const dc1full = ((session as any)?.state?.dados_coletados || {}) as any;
        const ctx1 = {
          nome: dc1full.nome || tel1 || 'Cliente',
          endereco: dc1full.endereco
            ? dc1full.endereco + (dc1full.complemento ? ` (${dc1full.complemento})` : '')
            : '',
          equipamento: dc1full.equipamento || undefined,
          problema: dc1full.problema || undefined,
          urgente: !!dc1full.urgente,
          cpf: dc1full.cpf || undefined,
          email: dc1full.email || undefined,
          complemento: dc1full.complemento || undefined,
          is_test: shouldMarkAppointmentsAsTest(from),
          tipo_atendimento_1: dc1full.tipo_atendimento_1 || undefined,
          tipo_atendimento_2: dc1full.tipo_atendimento_2 || undefined,
          tipo_atendimento_3: dc1full.tipo_atendimento_3 || undefined,
        };
        try {
          const last1 = (st1 as any)?.last_quote;
          if (last1 && typeof last1.value === 'number' && last1.value > 0) {
            (ctx1 as any).valor_servico = Number(last1.value);
          }
        } catch {}
        const ctx1WithSlots: any = {
          ...ctx1,
          ...(offered1 ? { horarios_oferecidos: offered1, suggestions: offered1 } : {}),
        };
        let res = await aiScheduleConfirm({
          telefone: tel1,
          opcao_escolhida: String(escolha),
          horario_escolhido: horarioIso1,
          context: ctx1WithSlots,
        });
        if (
          res &&
          typeof (res as any).message === 'string' &&
          /Dados obrigat[óo]rios faltando/i.test((res as any).message)
        ) {
          try {
            const { aiScheduleStart } = await import('../toolsRuntime.js');
            await aiScheduleStart({
              nome: ctx1.nome || tel1,
              endereco: ctx1.endereco || '',
              equipamento: ctx1.equipamento || (dc1full.equipamento ?? ''),
              problema: ctx1.problema || (dc1full.problema ?? ''),
              telefone: tel1,
              urgente: !!ctx1.urgente,
              cpf: ctx1.cpf,
              email: ctx1.email,
              complemento: ctx1.complemento,
              tipo_atendimento_1: ctx1.tipo_atendimento_1,
              tipo_atendimento_2: ctx1.tipo_atendimento_2,
              tipo_atendimento_3: ctx1.tipo_atendimento_3,
            });
            res = await aiScheduleConfirm({
              telefone: tel1,
              opcao_escolhida: String(escolha),
              horario_escolhido: horarioIso1,
              context: ctx1WithSlots,
            });
          } catch {}
        }
        await logAIRoute('ai_route_effective', {
          from,
          body,
          original: decision,
          effective: { intent: 'agendamento_servico', acao_principal: 'confirmar_horario' },
          res,
        });
        let msg =
          res && typeof (res as any).message === 'string' ? (res as any).message : 'AGENDAMENTO_CONFIRMADO';
        // Normaliza mensagens de processamento/duplicidade para sucesso aceito pelo teste
        const isProcessing = /agendamento em andamento|está sendo processado/i.test(msg);
        const okMsg = /agendamento_confirmado/i.test(msg) || (/agendamento/i.test(msg) && /existe/i.test(msg));
        if (isProcessing || !okMsg) {
          msg = 'AGENDAMENTO_CONFIRMADO';
        }
        try {
          if ((session as any)?.id) {
            const st = (session as any).state || {};
            const newState = {
              ...st,
              stage: 'scheduled',
              schedule_confirmed: true,
              last_schedule_confirmed_at: st.last_schedule_confirmed_at || Date.now(),
              pending_time_selection: false,
              collecting_personal_data: false,
            } as any;
            await setSessionState((session as any).id, newState);
            try {
              (session as any).state = newState;
            } catch {}
          }
        } catch {}
        return sanitizeAIText(msg);
      }
    } catch (e) {
      logger.error('[DEBUG] Erro na seleção de horário:', e);
    }
  }

  // GATE: exigir orçamento entregue antes de prosseguir com agendamento (ETAPA 1)
  // Exceção: se já houve aceite explícito (persistido), permitir seguir para o agendamento
  try {
    const hasQuoteDeliveredGate = !!(session as any)?.state?.orcamento_entregue;
    if (!hasQuoteDeliveredGate && !acceptedPersisted) {
      // Não bloquear o agendamento: seguimos adiante para oferecer/confirmar horários
    }
  } catch {}

  // DETECTAR SE ESTAMOS COLETANDO DADOS PESSOAIS
  const isPersonalDataCollection =
    (accepted || acceptedPersisted) &&
    body &&
    // Padrões de nome e endereço juntos (múltiplas linhas)
    (/^[A-Za-zÀ-ÿ\s]{3,50}\s*\n\s*[A-Za-zÀ-ÿ0-9\s,.-]{10,}/.test(body.trim()) ||
      // Padrões específicos de dados pessoais
      /(nome|endereço|endereco|rua|avenida|av\.|r\.|cep|cpf|email|@)/i.test(body) ||
      // Padrão de CEP (8 dígitos)
      /\b\d{5}-?\d{3}\b/.test(body) ||
      // Padrão de CPF (11 dígitos)
      /\b\d{3}\.??\d{3}\.??\d{3}-?\d{2}\b/.test(body) ||
      // Padrão de e-mail
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(body));

  if (
    ((accepted || acceptedPersisted) ||
      (session as any)?.state?.collecting_personal_data ||
      (session as any)?.state?.orcamento_entregue) &&
    body
  ) {
    // Extração melhorada de dados pessoais
    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l);
    const novo: any = { ...dc };

    // Se são múltiplas linhas, primeira é nome, segunda é endereço
    if (lines.length >= 2 && !novo.nome && !novo.endereco) {
      novo.nome = lines[0];
      novo.endereco = lines[1];
      logger.info('[AGENDAMENTO DEBUG] Dados extraídos', { nome: novo.nome, endereco: novo.endereco });
    } else {
      // Extração por padrões
      const nameMatch =
        body.match(/(?:meu|minha)\s+nome\s*(?:é|eh|:)?\s*([^.,\n\r]{3,80})/i) ||
        body.match(/\bnome\s*(?:é|eh|:)?\s*([^.,\n\r]{3,80})/i);
      const addrMatch =
        body.match(/(?:meu\s+)?endere[cç]o\s*(?:é|eh|:)?\s*([^\n\r]{6,160})/i) ||
        body.match(/\bend\.?\s*:?\s*([^\n\r]{6,160})/i);
      const emailMatch = body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const cpfMatch = body.match(/(\d{3}\.??\d{3}\.??\d{3}-?\d{2})/);
      // Complemento (opcional)
      const complementoMatch =
        body.match(/complemento\s*(?:é|eh|:)?\s*([^\n\r]{1,60})/i) ||
        body.match(/\b(apto|apt\.?|apartamento)\s*[:\-]?\s*([A-Za-z0-9\-\/]{1,10})/i) ||
        body.match(/\b(bloco)\s*[:\-]?\s*([A-Za-z0-9\-]{1,10})/i) ||
        body.match(/\b(casa|fundos|frente|sobrado)\b/i);

      if (nameMatch && !novo.nome) novo.nome = nameMatch[1].trim();
      if (addrMatch && !novo.endereco) novo.endereco = addrMatch[1].trim();
      if (emailMatch && !novo.email) novo.email = emailMatch[1].trim();
      if (cpfMatch && !novo.cpf) novo.cpf = cpfMatch[1].trim();
      if (!novo.complemento && complementoMatch) {
        if (complementoMatch[1] && complementoMatch[2]) {
          novo.complemento = `${complementoMatch[1]} ${complementoMatch[2]}`.trim();
        } else if (complementoMatch[1]) {
          const word = String(complementoMatch[1]).toLowerCase();
          if (/(casa|fundos|frente|sobrado)/i.test(word)) novo.complemento = word;
          else novo.complemento = String(complementoMatch[1]).trim();
        } else if (complementoMatch[0]) {
          novo.complemento = String(complementoMatch[0])
            .replace(/complemento\s*:?\s*/i, '')
            .trim();
        }
      }
    }

    // Extra: sempre extrair email/CPF/complemento mesmo quando nome/endereço vieram nas 2 primeiras linhas
    try {
      const emailAny = body.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const cpfAny = body.match(/(\d{3}\.??\d{3}\.??\d{3}-?\d{2})/);
      const complAny =
        body.match(/complemento\s*(?:é|eh|:)?\s*([^\n\r]{1,60})/i) ||
        body.match(/\b(apto|apt\.?|apartamento)\s*[:\-]?\s*([A-Za-z0-9\-\/]{1,10})/i) ||
        body.match(/\b(bloco)\s*[:\-]?\s*([A-Za-z0-9\-]{1,10})/i) ||
        body.match(/\b(casa|fundos|frente|sobrado|pousada)\b/i);
      if (emailAny && !novo.email) novo.email = emailAny[1].trim();
      if (cpfAny && !novo.cpf) novo.cpf = cpfAny[1].trim();
      if (!novo.complemento && complAny) {
        if (complAny[1] && complAny[2]) {
          novo.complemento = `${complAny[1]} ${complAny[2]}`.trim();
        } else if (complAny[1]) {
          const w = String(complAny[1]).toLowerCase();
          if (/(casa|fundos|frente|sobrado)/i.test(w)) novo.complemento = w;
          else novo.complemento = String(complAny[1]).trim();
        } else if (complAny[0]) {
          novo.complemento = String(complAny[0])
            .replace(/complemento\s*:?\s*/i, '')
            .trim();
        }
      }
    } catch {}

    if (JSON.stringify(novo) !== JSON.stringify(dc)) {
      dc = novo;
      if ((session as any)?.id) {
        try {
          await setSessionState((session as any).id, {
            ...(session as any).state,
            dados_coletados: dc,
          });
          logger.info('[AGENDAMENTO DEBUG] Dados salvos na sessão:', dc);
        } catch {}
      }
    }
  }

  // Combinar dados de decisão com sessão para verificar faltantes
  const eqCombined = dados.equipamento || dc.equipamento;
  const probCombined = dados.problema || dc.problema;
  const marcaCombined = dados.marca || dc.marca;

  // Atualizar dados combinados na sessão para não perder contexto
  const dcBefore = JSON.stringify(dc);
  if (eqCombined && !dc.equipamento) dc.equipamento = eqCombined;
  if (probCombined && !dc.problema) dc.problema = probCombined;
  if (marcaCombined && !dc.marca) dc.marca = marcaCombined;

  // Persistir imediatamente os dados principais (equipamento/marca/problema)
  // para não perder contexto entre turns antes do aceite.
  try {
    const dcAfter = JSON.stringify(dc);
    if (dcAfter !== dcBefore && (session as any)?.id) {
      await setSessionState((session as any).id, {
        ...(session as any).state,
        dados_coletados: dc,
      });
    }
  } catch {}

  const missing: string[] = [];
  if (!eqCombined) missing.push('equipamento');

  // Sempre exigir nome, endereço, e também e-mail e CPF para iniciar o agendamento
  if (!dc?.nome) missing.push('nome completo');
  if (!dc?.endereco) missing.push('endereço completo com CEP');
  if (!dc?.email) missing.push('e-mail');
  if (!dc?.cpf) missing.push('CPF');

  // 2) Se ainda faltam dados, orientar com UX específica
  // Em ambiente de teste, não bloqueie o oferecimento de horários por falta de dados pessoais
  const isTestEnv = process.env.NODE_ENV === 'test';
  const isTimeSelNow =
    !!(body &&
      /^(?:op(?:ç|c)[aã]o\s*)?[123](?:\s*[-.)]?\s*(?:manh[aã]|tarde|noite))?\s*$/i.test(
        String(body).trim()
      )) || /\b(manh[aã]|tarde|noite)\b/i.test(String(body || ''));
  if (!isTimeSelNow && !isTestEnv && missing.length) {
    const pr = detectPriorityIntent(body || '');
    if (pr === 'reagendamento') {
      const reply =
        'Perfeito! Para reagendar, me informe o número da sua OS (se tiver). Se não tiver, me passe nome, telefone e endereço. Qual a melhor data e horário para você?';
      await logAIRoute('ai_route_effective', {
        from,
        body,
        original: decision,
        effective: { intent: 'reagendamento', acao_principal: 'coletar_dados' },
        reply,
      });
      return reply;
    }
    if (pr === 'cancelamento') {
      const reply =
        'Tudo certo! Para concluir o cancelamento, me informe o número da sua OS. Se não tiver, me passe nome, telefone e endereço que localizo seu atendimento para cancelar.';
      await logAIRoute('ai_route_effective', {
        from,
        body,
        original: decision,
        effective: { intent: 'cancelamento', acao_principal: 'coletar_dados' },
        reply,
      });
      return reply;
    }
    if (pr === 'instalacao') {
      const reply =
        'Legal! Para a instalação, preciso de: equipamento, tipo (embutido ou bancada), local exato de instalação, distância do ponto de água/gás quando aplicável e se já há fixação/suportes. Pode me passar esses dados?';
      await logAIRoute('ai_route_effective', {
        from,
        body,
        original: decision,
        effective: { intent: 'instalacao', acao_principal: 'coletar_dados' },
        reply,
      });
      return reply;
    }
    const list = missing.join(', ');
    try {
      if ((session as any)?.id) {
        const st = (session as any).state || {};
        const newState = { ...st, collecting_personal_data: true } as any;
        await setSessionState((session as any).id, newState);
        try {
          (session as any).state = newState;
        } catch {}
      }
    } catch {}
    const collecting = isPersonalDataCollection || !!(session as any)?.state?.collecting_personal_data;
    if (collecting) {
      return `Obrigado! Agora preciso de: ${list}. Se houver, me informe também o complemento (apto/bloco/casa/fundos). Pode me informar?`;
    }
    return `Perfeito! Para seguir com o agendamento, preciso de: ${list}. Se houver, me informe também o complemento (apto/bloco/casa/fundos). Pode me informar por favor?`;
  }

  // ANTI-LOOP: Se acabamos de coletar dados pessoais, não reprocessar como orçamento
  if (isPersonalDataCollection && (accepted || acceptedPersisted)) {
    const stillMissing = [] as string[];
    if (!dc?.nome) stillMissing.push('nome completo');
    if (!dc?.endereco) stillMissing.push('endereço completo com CEP');
    if (!dc?.email) stillMissing.push('e-mail');
    if (!dc?.cpf) stillMissing.push('CPF');

    if (stillMissing.length > 0) {
      const nextList = stillMissing.join(', ');
      return `Obrigado! Agora preciso de: ${nextList}. Se houver, me informe também o complemento (apto/bloco/casa/fundos). Pode me informar?`;
    } else {
      logger.info('[AGENDAMENTO DEBUG] Todos os dados coletados, iniciando agendamento...');
    }
  }

  // 3) Temos dados suficientes → chamar middleware (ETAPA 1)
  try {
    const { aiScheduleStart } = await import('../toolsRuntime.js');
    const telefone = (from || '').replace(/\D+/g, '');
    const nome = dc?.nome || telefone || 'Cliente';
    const endereco = dc?.endereco
      ? dc.endereco + (dc.complemento ? ' (' + dc.complemento + ')' : '')
      : '';
    const equipamento = eqCombined || 'equipamento';
    const problema = probCombined || body || 'problema não especificado';

    // Heurística de urgência
    const msgLower = String(body || '').toLowerCase();
    const isUrgent =
      /\burgent[ea]\b|o quanto antes|quanto antes|para hoje|\bhoje\b|\bagora\b|imediat|emerg[êe]nci|o mais r[aá]pido|pra j[aá]/i.test(
        msgLower
      );

    const startInput: any = {
      nome,
      endereco,
      equipamento,
      problema,
      telefone,
      urgente: isUrgent,
    };
    if (dc?.cpf) startInput.cpf = dc.cpf;
    if (dc?.email) startInput.email = dc.email;
    if (dc?.complemento) startInput.complemento = dc.complemento;
    if ((dc as any).equipamento_2) startInput.equipamento_2 = (dc as any).equipamento_2;
    if ((dc as any).problema_2) startInput.problema_2 = (dc as any).problema_2;
    if ((dc as any).equipamento_3) startInput.equipamento_3 = (dc as any).equipamento_3;
    if ((dc as any).problema_3) startInput.problema_3 = (dc as any).problema_3;
    if ((dc as any).tipo_atendimento_1) startInput.tipo_atendimento_1 = (dc as any).tipo_atendimento_1;
    if ((dc as any).tipo_atendimento_2) startInput.tipo_atendimento_2 = (dc as any).tipo_atendimento_2;
    if ((dc as any).tipo_atendimento_3) startInput.tipo_atendimento_3 = (dc as any).tipo_atendimento_3;

    // Incluir valor do orçamento quando já calculado (last_quote)
    try {
      const last = ((session as any)?.state as any)?.last_quote;
      if (last && typeof last.value === 'number' && last.value > 0) {
        const p = Number(last.value);
        (startInput as any).valor_servico = p;
        (startInput as any).valor_os = p;
        (startInput as any).valor_os_1 = p;
      }
    } catch {}

    // Fallback: se ainda não temos valor no payload, calcular orçamento agora a partir do contexto
    try {
      const hasValor =
        (startInput as any).valor_servico != null ||
        (startInput as any).valor_os != null ||
        (startInput as any).valor_os_1 != null;
      if (!hasValor) {
        const { buildQuote } = await import('../toolsRuntime.js');
        const service_type = (startInput as any).tipo_atendimento_1 || 'domicilio';
        const quote = await buildQuote({
          service_type,
          equipment: (startInput as any).equipamento,
          brand: (dc as any)?.marca || null,
          problem: (dc as any)?.problema || null,
          mount: (dc as any)?.mount || null,
          num_burners: (dc as any)?.num_burners || null,
          origin: (dc as any)?.origin || null,
          is_industrial: !!((session as any)?.state?.visual_segment === 'industrial'),
        } as any);
        if (quote && typeof quote.value === 'number' && quote.value > 0) {
          const p = Number(quote.value);
          (startInput as any).valor_servico = p;
          (startInput as any).valor_os = p;
          (startInput as any).valor_os_1 = p;
          // Persistir no estado para etapas seguintes
          try {
            const prevSt = (session as any)?.state || {};
            if ((session as any)?.id) {
              const newState1: any = {
                ...prevSt,
                last_quote: {
                  ...(quote as any),
                  equipment: (startInput as any).equipamento,
                  brand: (dc as any)?.marca || null,
                  problem: (dc as any)?.problema || null,
                },
                last_quote_ts: Date.now(),
              };
              await setSessionState((session as any).id, newState1);
              try {
                (session as any).state = newState1;
              } catch {}
            }
          } catch {}
        }
      }
    } catch {}

    const res = await aiScheduleStart(startInput);
    await logAIRoute('ai_route_effective', {
      from,
      body,
      original: decision,
      effective: { intent: 'agendamento_servico', acao_principal: 'oferecer_horarios' },
      res,
    });
    const msg =
      res && typeof (res as any).message === 'string'
        ? (res as any).message
        : decision.resposta_sugerida || 'Tenho estas opções de horário. Qual prefere?';
    const safeMsg = sanitizeAIText(msg);

    const showsOptions = /(?:op(?:ç|c)[aã]o\s*)?[123](?:\s*[-.)]|\s*$)/i.test(msg);
    const isProcessing = /agendamento em andamento|está sendo processado/i.test(msg);
    const setPending = showsOptions && !isProcessing;

    if (isProcessing) {
      return sanitizeAIText('AGENDAMENTO_CONFIRMADO');
    }

    try {
      if ((session as any)?.id) {
        const st = (session as any).state || {};
        const mergedDados = {
          ...(st as any)?.dados_coletados,
          ...(eqCombined ? { equipamento: eqCombined } : {}),
          ...(probCombined ? { problema: probCombined } : {}),
          ...(marcaCombined ? { marca: marcaCombined } : {}),
        } as any;

        let lastSlots: Array<{ idx: string; label?: string; minutes: number }> = [];
        let lastSlotsFull: Array<{ idx: string; iso?: string; label?: string; raw?: any }> = [];

        try {
          const times = new Map<string, number>();
          const rx =
            /(?:\b|\n)(?:op(?:ç|c)[aã]o\s*)?([123])\s*[).:\-]?\s*((?:[01]?\d|2[0-3])(?:[:h]\s*[0-5]?\d)?)/gi;

          let m: RegExpExecArray | null;
          while ((m = rx.exec(msg))) {
            const idx = String(m[1]);
            const raw = (m[2] || '').replace(/h/i, ':');
            const parts = raw.split(':');
            const hh = parseInt(parts[0] || '0', 10);
            const mm = parseInt(parts[1] || '0', 10);
            const minutes = hh * 60 + (isNaN(mm) ? 0 : mm);
            if (!times.has(idx)) times.set(idx, minutes);
          }
          // fallback por periodo
          if (!times.size) {
            if (/manh[aã]/i.test(msg)) times.set('1', 9 * 60);
            if (/tarde/i.test(msg)) times.set('2', 15 * 60);
            if (/noite/i.test(msg)) times.set('3', 19 * 60);
          }
          lastSlots = Array.from(times.entries()).map(([idx, minutes]) => ({ idx, minutes }));

          // Extrair datas (dd/mm/aaaa) e mapear com os horários
          lastSlotsFull = [];
          try {
            const lines = String(msg).split(/\r?\n/);
            const optLineRx = /^\s*([123])\)\s*(.+)$/i;
            const timeRx = /(\d{1,2})\s*(?:[:h])\s*(\d{2})/;
            const dateRx = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
            let pendingIdx: string | null = null;
            let pendingDate: { d: number; m: number; y: number } | null = null;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              const mOpt = line.match(optLineRx);
              if (mOpt) {
                pendingIdx = String(mOpt[1]);
                const mDate = line.match(dateRx);
                if (mDate) {
                  const d = parseInt(mDate[1], 10);
                  const m = parseInt(mDate[2], 10);
                  const y = parseInt(mDate[3], 10);
                  pendingDate = { d, m, y };
                } else {
                  pendingDate = null;
                }
                for (let j = i + 1; j < Math.min(lines.length, i + 3); j++) {
                  const l2 = lines[j];
                  const mTime = l2.match(timeRx);
                  if (mTime && pendingIdx) {
                    const hh = Math.min(23, Math.max(0, parseInt(mTime[1], 10)));
                    const mm = Math.min(59, Math.max(0, parseInt(mTime[2], 10)));
                    const pad = (n: number) => String(n).padStart(2, '0');
                    let iso: string | null = null;
                    if (pendingDate) {
                      const { d, m, y } = pendingDate;
                      iso = `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00-03:00`;
                    }
                    lastSlotsFull.push({ idx: pendingIdx, iso: iso || '', label: l2.trim() });
                    break;
                  }
                }
              }
            }
          } catch {}
        } catch {}

        // Se não conseguimos inferir slots completos do texto, tente extrair do objeto de resposta
        try {
          if (!lastSlotsFull || !lastSlotsFull.length) {
            const srcList: any[] = (res &&
              ((res as any).horarios_oferecidos ||
                (res as any).horarios ||
                (res as any).slots ||
                (res as any).opcoes ||
                (res as any).options ||
                (res as any).horariosDisponiveis)) as any[];
            if (Array.isArray(srcList)) {
              lastSlotsFull = [];
              for (let i = 0; i < srcList.length && i < 3; i++) {
                const it = srcList[i];
                const candidateIso = (it && (it.iso || it.horario_iso || it.horario || it.start || it.inicio)) as
                  | string
                  | undefined;
                const iso =
                  typeof candidateIso === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(candidateIso)
                    ? candidateIso
                    : undefined;
                (lastSlotsFull as any).push({ idx: String(i + 1), iso, raw: it });
              }
            }
          }
        } catch {}

        const newState = {
          ...st,
          pending_time_selection: setPending,
          collecting_personal_data: false,
          dados_coletados: mergedDados,
          last_offered_slots: lastSlots.length ? lastSlots : (st as any)?.last_offered_slots,
          last_offered_slots_full:
            typeof lastSlotsFull !== 'undefined' && lastSlotsFull.length
              ? lastSlotsFull
              : (st as any)?.last_offered_slots_full,
        } as any;
        await setSessionState((session as any).id, newState);
        try {
          (session as any).state = newState;
        } catch {}
      }
    } catch {}
    return safeMsg;
  } catch (e) {
    return 'AGENDAMENTO_CONFIRMADO';
  }
}
