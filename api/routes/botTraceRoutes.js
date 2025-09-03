import express from 'express';
import { supabase } from '../config/supabase.js';
import { botAuth } from '../middleware/botAuth.js';

const router = express.Router();
router.use(botAuth);

router.get('/tracing', async (req, res) => {
  const { peer } = req.query;
  if (!peer) return res.json({ items: [] });
  const { data: sessions } = await supabase.from('bot_sessions').select('id').eq('peer_id', peer).order('updated_at', { ascending:false }).limit(1);
  const sid = sessions?.[0]?.id;
  if (!sid) return res.json({ items: [] });
  const { data } = await supabase.from('bot_messages').select('*').eq('session_id', sid).order('created_at');
  const traceId = `trace_${sid}`;
  return res.json({ items: data || [], traceId });
});

export default router;

