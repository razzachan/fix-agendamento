import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('blackouts').select('*').order('start_time');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ items: data || [] });
});

router.post('/', async (req, res) => {
  const { start_time, end_time, reason } = req.body || {};
  if (!start_time || !end_time) return res.status(400).json({ error: 'missing_fields' });
  const { data, error } = await supabase.from('blackouts').insert({ start_time, end_time, reason: reason || null }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok:true, item: data });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('blackouts').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok:true });
});

export default router;

