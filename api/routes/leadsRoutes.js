import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

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
    const { data: preSchedule, error: preScheduleError } = await supabase
      .from('pre_schedules')
      .insert({
        client_id: client.id,
        equipment_type: equipmentType || null,
        problem_description: problem || message,
        urgency_level: urgency || 'medium',
        source: 'whatsapp_claude',
        status: 'pending_response',
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
