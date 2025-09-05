import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('price_list').select('*').order('priority', { ascending: true });
    if (error) throw error;
    return res.json({ items: data || [] });
  } catch (e) {
    console.error('[api/price_list] get error', e);
    return res.status(500).json({ error: 'price_list_get_failed', message: e?.message });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    // upsert by primary key (assume id or composite), keep simple: delete all and insert
    await supabase.from('price_list').delete().neq('service_type', '__never__');
    if (items.length) {
      const payload = items.map((r) => ({
        service_type: r.service_type,
        region: r.region || null,
        urgency: r.urgency || null,
        base: r.base ?? null,
        min: r.min ?? null,
        max: r.max ?? null,
        priority: r.priority ?? 1,
        notes: r.notes || null
      }));
      const { error } = await supabase.from('price_list').insert(payload);
      if (error) throw error;
    }
    return res.json({ ok: true });
  } catch (e) {
    console.error('[api/price_list] bulk error', e);
    return res.status(500).json({ error: 'price_list_bulk_failed', message: e?.message });
  }
});

export default router;

