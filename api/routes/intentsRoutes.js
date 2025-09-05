import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('bot_intents').select('*').order('name');
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ items: data || [] });
});

router.post('/', async (req, res) => {
  const { name, examples = [], tool = null, tool_schema = null } = req.body || {};
  if (!name) return res.status(400).json({ error:'name_required' });
  const { data, error } = await supabase.from('bot_intents').insert({ name, examples, tool, tool_schema }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok:true, item: data });
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, examples, tool, tool_schema } = req.body || {};
  const { data, error } = await supabase.from('bot_intents').update({ name, examples, tool, tool_schema, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok:true, item: data });
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('bot_intents').delete().eq('id', id);
  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok:true });
});

export default router;

