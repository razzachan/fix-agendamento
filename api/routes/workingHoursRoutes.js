import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('working_hours').select('*').order('weekday');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ items: data || [] });
});

router.post('/bulk', async (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    await supabase.from('working_hours').delete().neq('weekday', -1);
    if (items.length) {
      const { error } = await supabase.from('working_hours').insert(items);
      if (error) throw error;
    }
    return res.json({ ok:true });
  } catch (e) {
    console.error('[working_hours/bulk] error', e);
    return res.status(500).json({ error:'bulk_failed', message:e?.message });
  }
});

export default router;

