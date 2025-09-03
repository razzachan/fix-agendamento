import express from 'express';
import { estimateQuote } from '../services/quoteService.js';

const router = express.Router();

router.post('/estimate', async (req, res) => {
  try {
    const result = await estimateQuote(req.body || {});
    return res.json({ ok: true, result });
  } catch (e) {
    console.error('[api/quote/estimate] error', e);
    return res.status(400).json({ ok: false, error: e?.message || 'bad_request' });
  }
});

export default router;

