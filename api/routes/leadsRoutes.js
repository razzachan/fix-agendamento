import express from 'express';
import { supabase } from '../config/supabase.js';
import { botAuth } from '../middleware/botAuth.js';

const router = express.Router();
const authenticateBot = botAuth;

// Endpoint para Claude enviar leads estruturados
router.post('/from-claude', async (req, res) => {
  try {
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

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .upsert(
        {
          phone: cleanPhone,
          name: customerName || 'Cliente WhatsApp',
          address: address || null,
          updated_at: now,
        },
        { onConflict: 'phone' }
      )
      .select('*')
      .single();

    if (clientError) {
      console.error('[leads/from-claude] Erro ao criar/atualizar cliente:', clientError);
      return res.status(500).json({
        error: true,
        message: 'Erro ao criar/atualizar cliente',
        details: clientError.message,
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

// PUT /api/leads/:id/status
router.put('/:id/status', authenticateBot, async (req, res) => {
  try {
    const { id } = req.params;
    const { crm_status, notes } = req.body || {};

    if (!crm_status) {
      return res.status(400).json({ error: 'crm_status is required' });
    }

    const updates = {
      crm_status,
      crm_last_interaction: new Date().toISOString(),
    };

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
