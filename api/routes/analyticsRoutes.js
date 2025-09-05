import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

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

export default router;

