import 'dotenv/config';

const API_URL = process.env.API_URL || 'http://127.0.0.1:3001';
const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL || process.env.API_URL || 'http://127.0.0.1:8000';
const QUOTE_OFFLINE_FALLBACK =
  process.env.QUOTE_OFFLINE_FALLBACK === 'true' || process.env.NODE_ENV === 'test';

function computeLocalQuote(payload: any) {
  // Fallback determinístico simplificado para testes offline
  const eq = String(payload?.equipment || '').toLowerCase();
  const st = String(payload?.service_type || 'domicilio');
  let base = 120;
  if (eq.includes('fog')) base = 150;
  if (eq.includes('forno') && st.includes('coleta')) base = 180;
  if (eq.includes('micro')) base = 130;
  const value = base;
  return {
    found: true,
    value,
    currency: 'BRL',
    service_type: st,
    equipment: payload?.equipment || 'equipamento',
    brand: payload?.brand || null,
    problem: payload?.problem || null,
  };
}

type BuildQuoteInput = {
  service_type: string;
  region?: string | null;
  urgency?: string | null;
  equipment?: string | null;
  power_type?: string | null;
  mount?: string | null;
  num_burners?: string | null;
  origin?: string | null;
  is_industrial?: boolean | null;
  brand?: string | null;
  problem?: string | null;
  segment?: string | null;
  class_level?: string | null;
};

export async function buildQuote(input: BuildQuoteInput) {
  // Mapeamento inteligente para service_type específico de price_list
  let st = input.service_type?.toLowerCase() || '';
  const eq = (input.equipment || '').toLowerCase();
  const power = (input.power_type || '').toLowerCase();
  const mount = (input.mount || '').toLowerCase();
  const burners = (input.num_burners || '').toLowerCase();
  const origin = (input.origin || '').toLowerCase();
  const industrial = !!input.is_industrial;
  let seg = (input.segment || '').toLowerCase();
  const classLevel = String((input as any).class_level || '').toLowerCase();

  // Consolidar segmento por regras de marca (chama API interna) — pular em modo de teste/offline
  if (!QUOTE_OFFLINE_FALLBACK) {
    try {
      const brand = String(input.brand || '').trim();
      if (brand) {
        const qs = new URLSearchParams({ brand, mount });
        const primary = API_URL;
        const fallback = 'http://127.0.0.1:3001';
        let resp: Response | null = null;
        try {
          resp = await fetch(`${primary}/api/brand-rules/resolve?${qs.toString()}`);
        } catch (e: any) {
          const msg = String(e?.message || '');
          if (
            (msg.includes('ECONNREFUSED') ||
              msg.includes('fetch failed') ||
              msg.includes('Connect Timeout')) &&
            !primary.includes('127.0.0.1') &&
            !primary.includes('localhost')
          ) {
            try {
              resp = await fetch(`${fallback}/api/brand-rules/resolve?${qs.toString()}`);
            } catch {}
          }
        }
        if (resp && resp.ok) {
          const data = await resp.json();
          const rule = data?.rule;
          if (rule) {
            const recommended = String(rule.recommended_segment || '').toLowerCase();
            const strat = String(rule.strategy || 'infer_by_photos');
            if (strat === 'force' && recommended) seg = recommended;
            else if (strat === 'prefer' && recommended) {
              const rank = (s: string) =>
                s === 'premium' ? 3 : s === 'inox' ? 2 : s === 'basico' ? 1 : 0;
              if (rank(recommended) > rank(seg)) seg = recommended;
            }
          }
        }
      }
    } catch (e: any) {
      console.warn('[buildQuote] brand rule consolidation failed', e?.message || e);
    }
  }

  // Regras contextualizadas
  if (eq.includes('coifa')) st = 'domicilio_coifa';

  if (eq.includes('fogão') || eq.includes('fogao') || eq.includes('cooktop')) {
    if (power.includes('gás') || power.includes('gas')) {
      // domicílio com especializações
      if (mount.includes('cooktop') || eq.includes('cooktop')) {
        if (burners.includes('4')) {
          if (seg === 'premium') st = 'domicilio_fogao_cooktop4_premium';
          else
            st = origin.includes('import')
              ? 'domicilio_fogao_cooktop4_importado'
              : 'domicilio_fogao_cooktop4_nacional';
        } else if (burners.includes('5')) {
          if (seg === 'premium') st = 'domicilio_fogao_cooktop5_premium';
          else
            st = origin.includes('import')
              ? 'domicilio_fogao_cooktop5_importado'
              : 'domicilio_fogao_cooktop5_nacional';
        } else {
          st = 'domicilio';
        }
      } else if (mount.includes('piso') || eq.includes('piso') || eq.includes('fogão')) {
        if (burners.includes('4')) {
          if (seg === 'inox') st = `domicilio_fogao_piso4_inox_${classLevel || 'basico'}`;
          else if (seg === 'premium') st = 'domicilio_fogao_piso4_premium';
          else st = 'domicilio_fogao_piso4_nacional';
        } else if (burners.includes('5')) {
          if (seg === 'inox') st = `domicilio_fogao_piso5_inox_${classLevel || 'basico'}`;
          else if (seg === 'premium') st = 'domicilio_fogao_piso5_premium';
          else st = 'domicilio_fogao_piso5_nacional';
        } else if (burners.includes('6')) {
          // Mantemos 6 bocas nacional (segmento pouco usado aqui)
          st = 'domicilio_fogao_piso6_nacional';
        } else {
          st = 'domicilio';
        }
      } else {
        st = 'domicilio';
      }
    }
  }

  // Fornos elétricos: nunca domicílio
  if (eq.includes('forno') && (power.includes('elétrico') || power.includes('eletrico'))) {
    if (mount.includes('bancada')) st = 'coleta_conserto';
    else st = 'coleta_diagnostico';
  }

  // Enviar também pistas de segmentação (basico/inox/premium)
  const payload: any = { ...input, service_type: st || input.service_type };
  if (
    !payload.segment &&
    /(básico|basico|inox|premium)/i.test(`${input.segment || ''} ${input.problem || ''}`)
  ) {
    payload.segment = (input.segment || '').toLowerCase();
  }
  if (payload.segment === 'inox' && input['class_level']) {
    payload.class_level = String(input['class_level']).toLowerCase();
  }

  const primary = API_URL;
  const fallback = 'http://127.0.0.1:3001';
  async function postQuote(base: string) {
    return await fetch(`${base}/api/quote/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
  let resp = await postQuote(primary).catch(async (e) => {
    // Retry com fallback local em caso de ECONNREFUSED/fetch failed/timeout e host não-local
    const msg = String(e?.message || '');
    if (
      (msg.includes('ECONNREFUSED') ||
        msg.includes('fetch failed') ||
        msg.includes('Connect Timeout')) &&
      !primary.includes('127.0.0.1') &&
      !primary.includes('localhost')
    ) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        return await postQuote(fallback);
      } catch {}
    }
    // Em ambiente de teste, permitir fallback offline determinístico
    if (QUOTE_OFFLINE_FALLBACK) {
      return null as any;
    }
    throw e;
  });
  if (!resp || !resp.ok) {
    if (!resp && !primary.includes('127.0.0.1') && !primary.includes('localhost')) {
      try {
        resp = await postQuote(fallback);
      } catch {}
    }
    if ((!resp || !resp.ok) && QUOTE_OFFLINE_FALLBACK) {
      return computeLocalQuote(payload);
    }
    if (!resp || !resp.ok) throw new Error(`quote failed: ${resp ? resp.status : 'no_response'}`);
  }
  const data = await resp.json();
  return data?.result;
}

export async function getAvailability(params: {
  date: string;
  region?: string | null;
  service_type?: string | null;
  duration?: number;
}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) qs.set(k, String(v));
  });
  const resp = await fetch(`${API_URL}/api/schedule/availability?${qs.toString()}`);
  if (!resp.ok) throw new Error(`availability failed: ${resp.status}`);
  return await resp.json();
}

export async function createAppointment(input: {
  client_name: string;
  start_time: string;
  end_time: string;
  address?: string;
}) {
  const resp = await fetch(`${API_URL}/api/schedule/book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!resp.ok) throw new Error(`book failed: ${resp.status}`);
  return await resp.json();
}

export async function cancelAppointment(input: { id: string; reason?: string }) {
  const resp = await fetch(`${API_URL}/api/schedule/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!resp.ok) throw new Error(`cancel failed: ${resp.status}`);
  return await resp.json();
}

export async function getOrderStatus(id: string) {
  const resp = await fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}/status`);
  if (!resp.ok) throw new Error(`order_status failed: ${resp.status}`);
  return await resp.json();
}

// Integração com middleware.py (ETAPA 1 e 2) para seguir regras de logística, agenda e conversões
export async function aiScheduleStart(input: {
  nome: string;
  endereco: string;
  equipamento: string;
  problema: string;
  telefone: string;
  urgente?: boolean;
}) {
  // Test-mode: return deterministic stub to avoid external HTTP in CI/tests
  if (process.env.NODE_ENV === 'test') {
    return { message: 'Tenho estas opções de horário: 1) 09:00 2) 10:30 3) 14:00' };
  }
  const resp = await fetch(`${MIDDLEWARE_URL}/agendamento-inteligente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nome: input.nome,
      endereco: input.endereco,
      equipamento: input.equipamento,
      problema: input.problema,
      telefone: input.telefone,
      urgente: input.urgente ? 'sim' : 'não',
    }),
  });
  if (!resp.ok) throw new Error(`aiScheduleStart failed: ${resp.status}`);
  return await resp.json();
}

export async function aiScheduleConfirm(input: { telefone: string; opcao_escolhida: string }) {
  // Test-mode: return deterministic confirmation
  if (process.env.NODE_ENV === 'test') {
    return { message: 'Agendamento confirmado!' };
  }
  const resp = await fetch(`${MIDDLEWARE_URL}/agendamento-inteligente`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      telefone: input.telefone,
      opcao_escolhida: input.opcao_escolhida,
    }),
  });
  if (!resp.ok) throw new Error(`aiScheduleConfirm failed: ${resp.status}`);
  return await resp.json();
}
