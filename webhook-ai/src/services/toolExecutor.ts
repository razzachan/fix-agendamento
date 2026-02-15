import {
  buildQuote,
  getAvailability,
  createAppointment,
  cancelAppointment,
  getOrderStatus,
  aiScheduleStart,
  aiScheduleConfirm,
} from './toolsRuntime.js';

function normalizePeerToPhone(peer?: string): string | undefined {
  if (!peer) return undefined;
  // WhatsApp JID costuma ser algo como "5511999999999@c.us"
  const noJid = peer.split('@')[0];
  const digits = noJid.replace(/\D+/g, '');
  return digits || undefined;
}

export async function tryExecuteTool(text: string, context?: { channel?: string; peer?: string }) {
  // tenta parsear quando o modelo responde com JSON de tool-call
  try {
    const cleaned = String(text || '')
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '');

    let obj: any = null;
    try {
      obj = JSON.parse(cleaned);
    } catch {
      // Extrair bloco JSON mesmo quando houver texto antes/depois
      const cand = cleaned;
      const idx = cand.indexOf('{"tool"');
      if (idx >= 0) {
        const json = (() => {
          let depth = 0,
            inStr = false,
            esc = false;
          for (let i = idx; i < cand.length; i++) {
            const ch = cand[i];
            if (inStr) {
              if (esc) esc = false;
              else if (ch === '\\') esc = true;
              else if (ch === '"') inStr = false;
            } else {
              if (ch === '"') inStr = true;
              else if (ch === '{') depth++;
              else if (ch === '}') {
                depth--;
                if (depth === 0) return cand.slice(idx, i + 1);
              }
            }
          }
          return null;
        })();
        if (json) {
          obj = JSON.parse(json);
        }
      }
    }

    if (!obj || typeof obj !== 'object') return null;
    if (!obj.tool || !obj.input) return null;

    // Preenchimento inteligente de campos comuns e mapeamento de sinônimos
    const input: any = { ...obj.input };

    // Mapear equipment -> service_type se necessário
    if (!input.service_type && input.equipment) input.service_type = String(input.equipment);
    // Mapear problema/issue/descricao -> description
    if (!input.description) {
      if (input.problema) input.description = String(input.problema);
      else if (input.issue) input.description = String(input.issue);
      else if (input.descricao) input.description = String(input.descricao);
    }

    const phone = normalizePeerToPhone(context?.peer);
    if (phone) {
      if (!input.phone) input.phone = phone;
      if (!input.client_name) input.client_name = phone;
    }

    // Preencher pistas com classificação visual salva na sessão
    let sessionState: any = undefined;
    let sessionRec: any = undefined;
    try {
      const { getOrCreateSession } = await import('./sessionStore.js');
      const { normalizePeerId } = await import('./peerId.js');
      if (context?.peer) {
        const normalized = normalizePeerId('whatsapp', context.peer) || context.peer;
        const s = await getOrCreateSession('whatsapp', normalized);
        sessionRec = s;
        sessionState = s?.state || {};
        if (
          !input.segment &&
          sessionState.visual_segment &&
          sessionState.visual_segment !== 'indeterminado'
        )
          input.segment = sessionState.visual_segment;
        if (
          !input.mount &&
          sessionState.visual_type &&
          sessionState.visual_type !== 'indeterminado'
        )
          input.mount = sessionState.visual_type === 'floor' ? 'piso' : 'cooktop';
        if (!input.num_burners && sessionState.visual_burners)
          input.num_burners = String(sessionState.visual_burners);
      }
    } catch {}

    // Guarda de segurança: só chamar buildQuote quando tivermos dados mínimos
    if (obj.tool === 'buildQuote') {
      const eq = String(input.equipment || '').toLowerCase();
      const power = String(input.power_type || '').toLowerCase();
      const desc = String(input.description || '').toLowerCase();

      // Gate universal: exigir MARCA e PROBLEMA antes de orçar
      const problemText = String(input.problem || input.description || '').trim();
      if (!input.brand || !problemText) {
        if (!input.brand && !problemText)
          return (
            'Antes de eu te passar o orçamento, preciso de 2 informações rápidas: a marca do equipamento e o problema específico (ex.: não acende, não esquenta, vazando, fazendo barulho). Pode me dizer?'
          );
        if (!input.brand)
          return 'Qual é a marca do equipamento? (Ex.: Brastemp, Consul, Fischer, Electrolux...)';
        return 'O que exatamente está acontecendo com ele? (Me descreva o defeito específico)';
      }
      // Normalizar para as ferramentas downstream
      input.problem = input.problem || problemText;

      // Inferir num_burners a partir da descrição, se não vier explícito
      if (!input.num_burners && desc) {
        const m = desc.match(/(?:\b|^)(4|5|6)\s*bocas?\b/);
        if (m) input.num_burners = m[1];
        else {
          const map: any = { quatro: '4', cinco: '5', seis: '6' };
          for (const [w, n] of Object.entries(map)) {
            if (desc.includes(`${w} bocas`) || desc.includes(`${w} boca`)) {
              input.num_burners = n;
              break;
            }
          }
        }
      }

      const isFogao =
        /fog[ãa]o|cooktop/.test(eq) ||
        ['piso', 'cooktop'].includes(String(input.mount || '').toLowerCase()) ||
        (sessionState?.visual_type && sessionState.visual_type !== 'indeterminado');
      const isGasLikely = power.includes('gás') || power.includes('gas') || isFogao; // default para fogão comum

      if (isFogao && isGasLikely) {
        const missing: string[] = [];
        if (!input.mount) missing.push('se é fogão de piso ou cooktop');
        if (!input.num_burners) missing.push('se ele é de 4, 5 ou 6 bocas');
        if (missing.length) {
          return `Para te passar o valor certinho, me diga ${missing.join(' e ')}.`;
        }
      }

      return await buildQuote(input);
    }

    // Normalizações/validações leves (quando existirem nos inputs)
    const normalizeCEP = (v?: string) => (v ? v.replace(/\D+/g, '').slice(0, 8) : v);
    const maskCEP = (v?: string) => (v && v.length === 8 ? `${v.slice(0, 5)}-${v.slice(5)}` : v);
    const normalizeCPF = (v?: string) => (v ? v.replace(/\D+/g, '').slice(0, 11) : v);
    const maskCPF = (v?: string) =>
      v && v.length === 11 ? `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}` : v;
    const isEmail = (v?: string) => !!(v && /.+@.+\..+/.test(v));

    if (obj.tool === 'createAppointment') {
      // tentar extrair cep do address
      if (typeof input.address === 'string') {
        const digits = normalizeCEP(input.address);
        if (digits && digits.length === 8) {
          input.address = input.address
            .replace(/\d{5}-?\d{3}/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
          input.zip_code = maskCEP(digits);
        }
      }
      if (typeof input.cpf === 'string') {
        const digits = normalizeCPF(input.cpf);
        if (digits?.length === 11) input.cpf = maskCPF(digits);
      }
      if (typeof input.email === 'string' && !isEmail(input.email)) {
        // deixar como veio; validação forte pode ser feita no backend/form
      }
    }

    switch (obj.tool) {
      case 'getAvailability':
        return await getAvailability(input);
      case 'createAppointment':
        return await createAppointment(input);
      case 'cancelAppointment':
        return await cancelAppointment(input);
      case 'getOrderStatus':
        return await getOrderStatus(input?.id || input);
      case 'aiScheduleStart': {
        const phone = normalizePeerToPhone(context?.peer) || input.telefone || input.phone;
        const payload = {
          nome: input.client_name || input.nome || phone,
          endereco: input.address || input.endereco || '',
          equipamento: input.equipment || input.equipamento || '',
          problema: input.description || input.problema || '',
          telefone: phone,
          urgente: input.urgente,
        };
        const result: any = await aiScheduleStart(payload);
        try {
          if (sessionRec?.id) {
            const { setSessionState } = await import('./sessionStore.js');
            const horarios =
              (result && (result.horarios_oferecidos || result.suggestions || result.slots)) || null;
            await setSessionState(sessionRec.id, {
              ai_schedule_context: payload,
              ai_schedule_suggestions: horarios,
              ai_schedule_suggestions_ts: Date.now(),
            });
          }
        } catch {}
        return result;
      }
      case 'aiScheduleConfirm': {
        const phone = normalizePeerToPhone(context?.peer) || input.telefone || input.phone;
        const opt = String(input.opcao_escolhida || input.choice || '').trim();
        // Enriquecer confirmação com o contexto/sugestões salvos na sessão.
        let ctx: any = undefined;
        try {
          const saved = sessionState || {};
          ctx = {
            ...(saved.ai_schedule_context || {}),
            horarios_oferecidos: saved.ai_schedule_suggestions || undefined,
            suggestions: saved.ai_schedule_suggestions || undefined,
          };
        } catch {}
        return await aiScheduleConfirm({ telefone: phone!, opcao_escolhida: opt, context: ctx });
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}
