import express from 'express';
import { supabase } from '../config/supabase.js';
import { botAuth } from '../middleware/botAuth.js';
import { requireBotOrAdmin } from '../middleware/botOrAdmin.js';

const router = express.Router();
const authenticateBot = botAuth;

const CRM_STATUSES = [
  'novo_lead',
  'orcamento_enviado',
  'aguardando_resposta',
  'interessado',
  'agendamento_pendente',
  'coleta_agendada',
  'em_diagnostico',
  'orcamento_detalhado',
  'aprovado',
  'em_reparo',
  'pronto_entrega',
  'entregue',
  'perdido',
  'cancelado',
];

const FINAL_CRM_STATUSES = new Set(['perdido', 'cancelado', 'entregue']);

function normalizePhone(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  const plus = raw.startsWith('+') ? '+' : '';
  const digits = raw.replace(/\D/g, '');
  return digits ? `${plus}${digits}` : '';
}

function deriveCrmStatusHint(state) {
  const st = state && typeof state === 'object' ? state : {};
  if (st.collecting_personal_data || st.accepted_service || st.pending_time_selection) {
    return 'agendamento_pendente';
  }
  if (st.orcamento_entregue) return 'orcamento_enviado';
  return 'aguardando_resposta';
}

function crmRank(status) {
  const s = String(status || '').trim();
  const order = [
    'novo_lead',
    'orcamento_enviado',
    'aguardando_resposta',
    'interessado',
    'agendamento_pendente',
    'coleta_agendada',
    'em_diagnostico',
    'orcamento_detalhado',
    'aprovado',
    'em_reparo',
    'pronto_entrega',
    'entregue',
    'perdido',
    'cancelado',
  ];
  const idx = order.indexOf(s);
  return idx >= 0 ? idx : -1;
}

function shouldAdvanceCrmStatus(current, next) {
  const cur = String(current || '').trim();
  const nx = String(next || '').trim();
  if (!nx) return false;
  if (FINAL_CRM_STATUSES.has(cur)) return false;
  if (!cur) return true;
  return crmRank(nx) > crmRank(cur);
}

function normalizePhoneCandidates(input) {
  const raw = String(input || '');
  let digits = raw.replace(/\D/g, '');

  // Remove prefixos comuns (ex.: 0...) mantendo somente dígitos
  digits = digits.replace(/^0+/, '');

  const candidates = new Set();
  if (digits) {
    candidates.add(digits);
    candidates.add(`+${digits}`);
  }

  // Se vier com DDI 55, adiciona variações sem o 55
  if (digits.startsWith('55') && digits.length > 11) {
    const noCountry = digits.slice(2);
    candidates.add(noCountry);
    candidates.add(`+55${noCountry}`);
    candidates.add(`55${noCountry}`);
  }

  // Se vier sem DDI e parecer BR (11 dígitos), adiciona variações com 55
  if (digits.length === 11 && !digits.startsWith('55')) {
    candidates.add(`55${digits}`);
    candidates.add(`+55${digits}`);
  }

  return Array.from(candidates).filter(Boolean);
}

async function resolveClientIdsBySearch(search) {
  const q = String(search || '').trim();
  if (!q) return null;

  const digits = q.replace(/\D/g, '');
  const phoneLike = digits ? `%${digits}%` : null;
  const nameLike = `%${q}%`;

  // Busca conservadora: limita ids retornados para não explodir o IN() no leads.
  let query = supabase
    .from('clients')
    .select('id, name, phone')
    .limit(200);

  if (phoneLike) {
    query = query.or(`name.ilike.${nameLike},phone.ilike.${phoneLike}`);
  } else {
    query = query.ilike('name', nameLike);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((c) => c.id).filter(Boolean);
}

// Endpoint para Claude enviar leads estruturados
router.post('/from-claude', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: true,
        message: 'Supabase não configurado na API',
        details: 'missing_supabase_env',
      });
    }

    const body = req.body || {};
    const {
      phone,
      message,
      extracted_data: extractedData = {},
    } = body;

    const {
      equipment_type: equipmentType,
      problem,
      urgency,
      customer_name: customerName,
      customer_email: customerEmail,
      address,
    } = extractedData;

    if (!phone || !message) {
      return res.status(400).json({
        error: true,
        message: 'Campos obrigatórios ausentes: phone e message',
      });
    }

    const now = new Date().toISOString();

    // 1. Busca ou cria cliente (usando phone como chave principal)
    const cleanPhone = String(phone).replace(/[^0-9+]/g, '');

    // Alguns ambientes exigem clients.email NOT NULL; use um placeholder estável quando não vier do payload.
    const normalizedDigits = cleanPhone.replace(/[^0-9]/g, '');
    const emailCandidate = (customerEmail || '').toString().trim();
    const fallbackEmail = normalizedDigits
      ? `whatsapp+${normalizedDigits}@fixfogoes.local`
      : `whatsapp+unknown@fixfogoes.local`;

    const baseClientPayload = {
      phone: cleanPhone,
      name: customerName || 'Cliente WhatsApp',
      email: emailCandidate.includes('@') ? emailCandidate : fallbackEmail,
      address: address || null,
    };

    // Evitar upsert/onConflict: em alguns ambientes o schema cache do PostgREST pode divergir.
    // Fluxo: tenta localizar por phone; se existir, atualiza campos básicos; se não, insere.
    const { data: existingClient, error: findClientError } = await supabase
      .from('clients')
      .select('id, phone, name, email, address')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (findClientError) {
      console.error('[leads/from-claude] Erro ao buscar cliente:', findClientError);
      return res.status(500).json({
        error: true,
        message: 'Erro ao buscar cliente',
        details: findClientError.message,
      });
    }

    let client = existingClient;
    if (client?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('clients')
        .update({
          name: baseClientPayload.name,
          address: baseClientPayload.address,
        })
        .eq('id', client.id)
        .select('id, phone, name, email, address')
        .single();

      if (updateError) {
        console.error('[leads/from-claude] Erro ao atualizar cliente:', updateError);
        return res.status(500).json({
          error: true,
          message: 'Erro ao atualizar cliente',
          details: updateError.message,
        });
      }

      client = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('clients')
        .insert(baseClientPayload)
        .select('id, phone, name, email, address')
        .single();

      if (insertError) {
        console.error('[leads/from-claude] Erro ao criar cliente:', insertError);
        return res.status(500).json({
          error: true,
          message: 'Erro ao criar cliente',
          details: insertError.message,
        });
      }

      client = inserted;
    }

    if (!client?.id) {
      return res.status(500).json({
        error: true,
        message: 'Cliente não retornou id após criação/atualização',
        details: 'client_missing_id',
      });
    }

    // 2. Cria pré-agendamento em pre_schedules (tabela dedicada para leads do bot/Claude)
    // Observação: /pending filtra por crm_status e crm_next_followup. Preenchemos aqui
    // para que o lead recém-chegado apareça como “pendente de ação” imediatamente.
    const { data: preSchedule, error: preScheduleError } = await supabase
      .from('pre_schedules')
      .insert({
        client_id: client.id,
        equipment_type: equipmentType || null,
        problem_description: problem || message,
        urgency_level: urgency || 'medium',
        source: 'whatsapp_claude',
        status: 'pending_response',
        crm_status: 'aguardando_resposta',
        crm_last_interaction: now,
        crm_next_followup: now,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (preScheduleError) {
      console.error('[leads/from-claude] Erro ao criar pré-agendamento:', preScheduleError);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar pré-agendamento',
        details: preScheduleError.message,
      });
    }

    // 3. Registra interação do Claude para auditoria
    try {
      await supabase.from('claude_interactions').insert({
        phone: cleanPhone,
        raw_message: message,
        extracted_equipment: equipmentType || null,
        extracted_problem: problem || null,
        urgency_level: urgency || 'medium',
        suggested_response: getResponseTemplate(equipmentType, problem),
        pre_schedule_id: preSchedule.id,
      });
    } catch (logError) {
      console.warn('[leads/from-claude] Falha ao registrar claude_interaction (não bloqueante):', logError);
    }

    // 4. Retorna template de resposta sugerida
    const template = getResponseTemplate(equipmentType, problem);

    return res.json({
      success: true,
      pre_schedule_id: preSchedule.id,
      client_id: client.id,
      suggested_response: template,
    });
  } catch (error) {
    console.error('[leads/from-claude] Erro inesperado:', error);
    return res.status(500).json({
      error: true,
      message: 'Erro interno ao processar lead do Claude',
      details: error.message,
    });
  }
});

// POST /api/leads/sync-from-bot
// Sincroniza variáveis/estado do bot para o CRM, sem criar leads duplicados.
// Política (MVP): 1 lead ativo por telefone (reutiliza o mais recente não-finalizado).
router.post('/sync-from-bot', requireBotOrAdmin, async (req, res) => {
  try {
    const body = req.body || {};
    const phone = normalizePhone(body.phone);
    const message = body.message ? String(body.message) : '';
    const state = body.state && typeof body.state === 'object' ? body.state : {};
    const extracted = body.extracted_data && typeof body.extracted_data === 'object' ? body.extracted_data : {};
    const now = new Date().toISOString();

    if (!phone) {
      return res.status(400).json({ success: false, error: 'phone is required' });
    }

    const digitsOnly = phone.replace(/\D/g, '');
    const emailCandidate = String(extracted.customer_email || extracted.email || '').trim();
    const fallbackEmail = digitsOnly ? `whatsapp+${digitsOnly}@fixfogoes.local` : `whatsapp+unknown@fixfogoes.local`;

    const customerName = extracted.customer_name || extracted.name || null;
    const address = extracted.address || null;
    const equipmentType = extracted.equipment_type || extracted.equipamento || null;
    const problem = extracted.problem || extracted.problema || null;
    const urgency = extracted.urgency || extracted.urgency_level || null;

    const baseClientPayload = {
      phone,
      name: customerName || 'Cliente WhatsApp',
      email: emailCandidate.includes('@') ? emailCandidate : fallbackEmail,
      address: address || null,
    };

    const { data: existingClient, error: findClientError } = await supabase
      .from('clients')
      .select('id, phone, name, email, address')
      .eq('phone', phone)
      .maybeSingle();
    if (findClientError) throw findClientError;

    let client = existingClient;
    if (client?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('clients')
        .update({ name: baseClientPayload.name, address: baseClientPayload.address })
        .eq('id', client.id)
        .select('id, phone, name, email, address')
        .single();
      if (updateError) throw updateError;
      client = updated;
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('clients')
        .insert(baseClientPayload)
        .select('id, phone, name, email, address')
        .single();
      if (insertError) throw insertError;
      client = inserted;
    }

    if (!client?.id) {
      return res.status(500).json({ success: false, error: 'client_missing_id' });
    }

    const { data: activeLead, error: activeError } = await supabase
      .from('pre_schedules')
      .select('id, crm_status, crm_notes, created_at')
      .eq('client_id', client.id)
      .or('crm_status.is.null,crm_status.not.in.(perdido,cancelado,entregue)')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (activeError) throw activeError;

    const statusHint = deriveCrmStatusHint(state);

    let leadId = activeLead?.id;
    if (leadId) {
      const patch = {
        updated_at: now,
        crm_last_interaction: now,
      };
      if (equipmentType) patch.equipment_type = equipmentType;
      if (problem || message) patch.problem_description = problem || message;
      if (urgency) patch.urgency_level = urgency;
      if (shouldAdvanceCrmStatus(activeLead?.crm_status, statusHint)) {
        patch.crm_status = statusHint;
      }
      if (body.note || body.notes) {
        const noteText = String(body.note || body.notes).trim();
        if (noteText) {
          const existingNotes = Array.isArray(activeLead?.crm_notes) ? activeLead.crm_notes : [];
          patch.crm_notes = [...existingNotes, noteText];
        }
      }

      const { data: updatedLead, error: updError } = await supabase
        .from('pre_schedules')
        .update(patch)
        .eq('id', leadId)
        .select('*')
        .single();
      if (updError) throw updError;
      leadId = updatedLead?.id;
    } else {
      const { data: preSchedule, error: preScheduleError } = await supabase
        .from('pre_schedules')
        .insert({
          client_id: client.id,
          equipment_type: equipmentType || null,
          problem_description: problem || message || null,
          urgency_level: urgency || 'medium',
          source: 'whatsapp_bot',
          status: 'pending_response',
          crm_status: statusHint,
          crm_last_interaction: now,
          crm_next_followup: now,
          created_at: now,
          updated_at: now,
        })
        .select('*')
        .single();
      if (preScheduleError) throw preScheduleError;
      leadId = preSchedule?.id;
    }

    try {
      if (leadId) await supabase.rpc('recalculate_lead_score', { lead_id: leadId });
    } catch {}

    return res.json({ success: true, client_id: client.id, lead_id: leadId, status_hint: statusHint });
  } catch (error) {
    console.error('[LEAD] Error syncing from bot:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/leads/pending
router.get('/pending', authenticateBot, async (req, res) => {
  try {
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('pre_schedules')
      .select(
        `
        *,
        clients:client_id (id, name, phone, address)
      `,
      )
      .lte('crm_next_followup', nowIso)
      .in('crm_status', ['aguardando_resposta', 'interessado'])
      .order('crm_score', { ascending: false })
      .limit(20);

    if (error) throw error;
    return res.json({ success: true, count: (data || []).length, leads: data || [] });
  } catch (error) {
    console.error('[LEAD] Error fetching pending:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leads
// Lista completa com filtros e paginação (usado no CRM frontend e no MCP).
router.get('/', requireBotOrAdmin, async (req, res) => {
  try {
    const {
      status,
      crm_status,
      score_min,
      score_max,
      limit,
      page,
      order_by,
      order,
      created_from,
      created_to,
      search,
    } = req.query || {};

    const parsedLimit = Math.min(Math.max(parseInt(limit ?? '20', 10) || 20, 1), 200);
    const parsedPage = Math.max(parseInt(page ?? '0', 10) || 0, 0);
    const orderByAllowed = new Set(['crm_score', 'created_at', 'crm_last_interaction', 'crm_next_followup']);
    const orderBy = orderByAllowed.has(String(order_by)) ? String(order_by) : 'created_at';
    const orderDir = String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';

    let query = supabase
      .from('pre_schedules')
      .select(
        `
        *,
        clients:client_id (id, name, phone, email, address, created_at)
      `,
        { count: 'exact' },
      );

    if (status) {
      const s = String(status);
      if (s === 'ativo') {
        // Exclui finalizados
        // Inclui também crm_status NULL (Postgres: NULL não passa em NOT IN)
        query = query.or('crm_status.is.null,crm_status.not.in.(perdido,cancelado,entregue)');
      } else if (CRM_STATUSES.includes(s)) {
        // Compat: status como crm_status
        query = query.eq('crm_status', s);
      } else {
        // Compat legado: status interno do pre_schedule
        query = query.eq('status', s);
      }
    }
    if (crm_status) query = query.eq('crm_status', String(crm_status));
    if (score_min !== undefined) query = query.gte('crm_score', Number(score_min));
    if (score_max !== undefined) query = query.lte('crm_score', Number(score_max));

    if (created_from) query = query.gte('created_at', String(created_from));
    if (created_to) query = query.lte('created_at', String(created_to));

    if (search) {
      const ids = await resolveClientIdsBySearch(search);
      if (!ids || ids.length === 0) {
        return res.json({ success: true, count: 0, total: 0, leads: [] });
      }
      query = query.in('client_id', ids);
    }

    query = query.order(orderBy, { ascending: orderDir === 'asc' });
    query = query.range(parsedPage * parsedLimit, parsedPage * parsedLimit + parsedLimit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    return res.json({
      success: true,
      count: (data || []).length,
      total: count || 0,
      leads: data || [],
    });
  } catch (error) {
    console.error('[LEAD] Error fetching leads:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leads/by-phone/:phone
router.get('/by-phone/:phone', requireBotOrAdmin, async (req, res) => {
  try {
    const { phone } = req.params;
    const candidates = normalizePhoneCandidates(phone);

    if (!candidates.length) {
      return res.status(400).json({ success: false, message: 'phone is required' });
    }

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name, phone, email, address, created_at')
      .in('phone', candidates)
      .maybeSingle();

    if (clientError) throw clientError;

    if (!client?.id) {
      return res.json({ success: true, leads: [], client: null });
    }

    const { data: leads, error: leadsError } = await supabase
      .from('pre_schedules')
      .select(
        `
        *,
        clients:client_id (id, name, phone, email, address, created_at)
      `,
      )
      .eq('client_id', client.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (leadsError) throw leadsError;

    return res.json({ success: true, leads: leads || [], client });
  } catch (error) {
    console.error('[LEAD] Error fetching leads by phone:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/leads/:id
router.get('/:id', requireBotOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('pre_schedules')
      .select(
        `
        *,
        clients:client_id (id, name, phone, email, address, created_at)
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ success: false, message: 'Lead not found' });

    return res.json({ success: true, lead: data });
  } catch (error) {
    console.error('[LEAD] Error fetching lead by id:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/leads/:id/status
router.put('/:id/status', requireBotOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { crm_status, notes, crm_score } = req.body || {};

    if (!crm_status) {
      return res.status(400).json({ error: 'crm_status is required' });
    }

    if (!CRM_STATUSES.includes(String(crm_status))) {
      return res.status(400).json({ error: 'invalid_crm_status' });
    }

    const updates = {
      crm_status,
      crm_last_interaction: new Date().toISOString(),
    };

    if (crm_score !== undefined && crm_score !== null && Number.isFinite(Number(crm_score))) {
      updates.crm_score = Number(crm_score);
    }

    if (notes) {
      const { data: current } = await supabase
        .from('pre_schedules')
        .select('crm_notes')
        .eq('id', id)
        .single();

      const existingNotes = current?.crm_notes || [];
      updates.crm_notes = [...existingNotes, notes];
    }

    const { data, error } = await supabase
      .from('pre_schedules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Recalcula score e agenda próximo follow-up quando fizer sentido.
    let recalculatedScore = null;
    const { data: scoreData, error: scoreError } = await supabase.rpc('recalculate_lead_score', { lead_id: id });
    if (scoreError) {
      console.warn('[LEAD] recalculate_lead_score failed (non-blocking):', scoreError);
    } else {
      recalculatedScore = scoreData;
    }

    const needsFollowup = ['aguardando_resposta', 'interessado'].includes(String(crm_status));
    if (needsFollowup) {
      try {
        const scoreForFollowup = typeof recalculatedScore === 'number' ? recalculatedScore : (data?.crm_score ?? 50);
        // Preferimos usar a function do banco (mantém a regra em um lugar só).
        const { data: nextData, error: nextError } = await supabase.rpc('calculate_next_followup', { score: scoreForFollowup });
        if (nextError) throw nextError;
        await supabase
          .from('pre_schedules')
          .update({ crm_next_followup: nextData })
          .eq('id', id);
      } catch (followupError) {
        console.warn('[LEAD] calculate_next_followup failed (non-blocking):', followupError);
      }
    } else {
      // Se saiu do funil de follow-up, limpa a data para não aparecer como pendente.
      try {
        await supabase
          .from('pre_schedules')
          .update({ crm_next_followup: null })
          .eq('id', id);
      } catch (clearError) {
        console.warn('[LEAD] clearing crm_next_followup failed (non-blocking):', clearError);
      }
    }

    return res.json({ success: true, lead: data });
  } catch (error) {
    console.error('[LEAD] Error updating status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/leads/:id/notes
router.post('/:id/notes', requireBotOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { note, author } = req.body || {};

    if (!note || !String(note).trim()) {
      return res.status(400).json({ success: false, message: 'note is required' });
    }

    const noteText = author ? `${String(author).trim()}: ${String(note).trim()}` : String(note).trim();

    const { data: current, error: currentError } = await supabase
      .from('pre_schedules')
      .select('crm_notes')
      .eq('id', id)
      .maybeSingle();

    if (currentError) throw currentError;

    const existingNotes = current?.crm_notes || [];
    const nextNotes = [...existingNotes, noteText];

    const { data: updated, error: updateError } = await supabase
      .from('pre_schedules')
      .update({ crm_notes: nextNotes, crm_last_interaction: new Date().toISOString() })
      .eq('id', id)
      .select(
        `
        *,
        clients:client_id (id, name, phone, email, address, created_at)
      `,
      )
      .single();

    if (updateError) throw updateError;

    return res.json({ success: true, lead: updated });
  } catch (error) {
    console.error('[LEAD] Error adding note:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper: pega template baseado no equipamento/problema
function getResponseTemplate(equipment, problem) {
  const normalizedEquipment = (equipment || '').toString().toLowerCase();
  const normalizedProblem = (problem || '').toString().toLowerCase();

  const templates = {
    microondas: {
      'não aquece': `Quando microondas funciona tudo mas não esquenta ou faz barulho tipo um ronco bem alto o problema é na peça que gera as microondas. Chama-se magnetron, precisa trocar.

Valor de manutenção fica em R$350,00 (por microondas) pra modelos de bancada. Coletamos ele aí e entregamos consertado em até 5 dias úteis.

Gostaria de agendar?`,
    },
    default: `Nestes casos coletamos ele/ela pra poder te passar um diagnóstico preciso e um orçamento correto.

O valor da coleta + diagnóstico fica em R$350,00 por equipamento (este valor é 100% abatido do valor final de serviço).

Coletamos, diagnosticamos, consertamos e entregamos em até 5 dias úteis.

O serviço tem 3 meses de garantia e aceitamos cartão e dividimos também se precisar.

Gostaria de agendar?`,
  };

  if (normalizedEquipment.includes('micro') && normalizedProblem.includes('não aquece')) {
    return templates.microondas['não aquece'];
  }

  return templates.default;
}

export default router;
