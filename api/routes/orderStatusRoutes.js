import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

router.get('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('service_orders').select('status, last_progress_id').eq('id', id).single();
    if (error) return res.status(404).json({ ok:false, error:'order_not_found' });

    const status = data.status;
    let progress = null;
    if (data.last_progress_id) {
      const { data: prog } = await supabase.from('service_order_progress').select('*').eq('id', data.last_progress_id).single();
      progress = prog || null;
    }
    return res.json({ ok:true, id, status, progress });
  } catch (e) {
    console.error('[orders/:id/status] error', e);
    return res.status(500).json({ ok:false, error:'status_failed', message:e?.message });
  }
});

export default router;

