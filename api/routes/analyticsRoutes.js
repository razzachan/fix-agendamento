import express from 'express';
import { supabase } from '../config/supabase.js';
import { requireBotOrAdmin } from '../middleware/botOrAdmin.js';

const router = express.Router();

function coercePeriodDays(input, fallback = 30) {
  const n = parseInt(String(input ?? ''), 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.max(n, 1), 365);
}

router.get('/kpis', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filters = (q)=>{
      if (from) q = q.gte('started_at', from);
      if (to) q = q.lte('started_at', to);
      return q;
    };

    // Conversas iniciadas
    let q1 = supabase.from('conversation_threads').select('id', { count: 'exact', head: true });
    q1 = filters(q1);
    const t1 = await q1;
    const conversations = t1.count || 0;

    // Conversas fechadas
    let q2 = supabase.from('conversation_threads').select('id', { count: 'exact', head: true }).not('closed_at', 'is', null);
    q2 = filters(q2);
    const t2 = await q2;
    const closed = t2.count || 0;

    // Agendamentos criados
    let q3 = supabase.from('calendar_events').select('id', { count: 'exact', head: true });
    if (from) q3 = q3.gte('created_at', from);
    if (to) q3 = q3.lte('created_at', to);
    const t3 = await q3;
    const appointments = t3.count || 0;

    // Taxa de resolução
    const resolutionRate = conversations > 0 ? Number(((closed / conversations) * 100).toFixed(1)) : 0;

    return res.json({ ok:true, conversations, closed, appointments, resolutionRate });
  } catch (e) {
    console.error('[analytics/kpis] error', e);
    return res.status(500).json({ ok:false, error:'kpi_failed', message:e?.message });
  }
});

// Listar conversas + mensagens (para dashboard) com service role
router.get('/threads', async (req, res) => {
  try {
    const { from, to, contact } = req.query;
    let q = supabase
      .from('conversation_threads')
      .select('id, contact, channel, started_at, closed_at, conversation_messages(*)')
      .order('started_at', { ascending: false })
      .limit(50);
    if (from) q = q.gte('started_at', from);
    if (to) q = q.lte('started_at', to);
    if (contact) q = q.ilike('contact', `%${contact}%`);

    const { data, error } = await q;
    if (error) throw error;
    return res.json({ ok:true, items: data || [] });
  } catch (e) {
    console.error('[analytics/threads] error', e);
    return res.status(500).json({ ok:false, error:'threads_failed', message:e?.message });
  }
});

router.post('/threads/:id/close', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ ok:false, error:'id_required' });
    const { data, error } = await supabase
      .from('conversation_threads')
      .update({ closed_at: new Date().toISOString() })
      .eq('id', id)
      .is('closed_at', null)
      .select('id, closed_at')
      .single();
    if (error) return res.status(404).json({ ok:false, error:'thread_not_found_or_closed' });
    return res.json({ ok:true, thread: data });
  } catch (e) {
    console.error('[analytics/threads/:id/close] error', e);
    return res.status(500).json({ ok:false, error:'thread_close_failed', message:e?.message });
  }
});

// Relatório de divergências de preços (orçamento vs valor final)
router.get('/pricing-divergences', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('get_pricing_divergences', {
      days_back: parseInt(req.query.days) || 30
    });
    if (error) throw error;
    res.json({ ok: true, data: data || [] });
  } catch (e) {
    console.error('[analytics/pricing-divergences] error', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /api/analytics/crm
router.get('/crm', requireBotOrAdmin, async (req, res) => {
  try {
    const periodDays = coercePeriodDays(req.query?.period_days, 30);

    // Use view directly for default period (30d)
    if (periodDays === 30) {
      const { data, error } = await supabase
        .from('crm_dashboard_metrics')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      const row = data || {};

      const metrics = {
        novos_leads: row.novos_leads ?? 0,
        orcamentos_enviados: row.orcamentos_enviados ?? 0,
        aguardando_resposta: row.aguardando_resposta ?? 0,
        interessados: row.interessados ?? 0,
        agendamentos_pendentes: row.agendamentos_pendentes ?? 0,
        coletas_agendadas: row.coletas_agendadas ?? 0,
        em_diagnostico: row.em_diagnostico ?? 0,
        orcamentos_detalhados: row.orcamentos_detalhados ?? 0,
        aprovados: row.aprovados ?? 0,
        em_reparo: row.em_reparo ?? 0,
        prontos_entrega: row.prontos_entrega ?? 0,
        entregues: row.entregues ?? 0,
        perdidos: row.perdidos ?? 0,
        leads_quentes: row.leads_quentes ?? 0,
        leads_mornos: row.leads_mornos ?? 0,
        leads_frios: row.leads_frios ?? 0,
        leads_congelados: row.leads_congelados ?? 0,
      };

      return res.json({ success: true, metrics, period_days: row.period_days ?? 30 });
    }

    // Optional period: compute from pre_schedules (same logic as view)
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - periodDays);
    const fromIso = fromDate.toISOString();

    const statuses = [
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
    ];

    const metrics = {
      novos_leads: 0,
      orcamentos_enviados: 0,
      aguardando_resposta: 0,
      interessados: 0,
      agendamentos_pendentes: 0,
      coletas_agendadas: 0,
      em_diagnostico: 0,
      orcamentos_detalhados: 0,
      aprovados: 0,
      em_reparo: 0,
      prontos_entrega: 0,
      entregues: 0,
      perdidos: 0,
      leads_quentes: 0,
      leads_mornos: 0,
      leads_frios: 0,
      leads_congelados: 0,
    };

    const statusToKey = {
      novo_lead: 'novos_leads',
      orcamento_enviado: 'orcamentos_enviados',
      aguardando_resposta: 'aguardando_resposta',
      interessado: 'interessados',
      agendamento_pendente: 'agendamentos_pendentes',
      coleta_agendada: 'coletas_agendadas',
      em_diagnostico: 'em_diagnostico',
      orcamento_detalhado: 'orcamentos_detalhados',
      aprovado: 'aprovados',
      em_reparo: 'em_reparo',
      pronto_entrega: 'prontos_entrega',
      entregue: 'entregues',
      perdido: 'perdidos',
    };

    // Fetch minimal fields and aggregate in JS (keeps compatibility without RPC)
    const { data, error } = await supabase
      .from('pre_schedules')
      .select('crm_status, crm_score')
      .gte('created_at', fromIso)
      .in('crm_status', statuses);

    if (error) throw error;

    for (const row of data || []) {
      const key = statusToKey[row.crm_status];
      if (key) metrics[key] += 1;

      const s = Number(row.crm_score ?? 0);
      if (s >= 80) metrics.leads_quentes += 1;
      else if (s >= 60) metrics.leads_mornos += 1;
      else if (s >= 40) metrics.leads_frios += 1;
      else metrics.leads_congelados += 1;
    }

    return res.json({ success: true, metrics, period_days: periodDays });
  } catch (e) {
    console.error('[analytics/crm] error', e);
    return res.status(500).json({ success: false, error: 'crm_metrics_failed', message: e?.message });
  }
});

export default router;

