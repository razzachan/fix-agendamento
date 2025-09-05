import express from 'express';
import rateLimit from 'express-rate-limit';
import { botAuth } from '../middleware/botAuth.js';

const router = express.Router();

// Rate limit básico para endpoints do bot
const limiter = rateLimit({ windowMs: 60 * 1000, max: 20 });
router.use(limiter);

// Descontinuado: WhatsApp Cloud API (WABA)
router.post('/test-send', botAuth, async (_req, res) => {
  return res.status(410).json({ ok: false, error: 'waba_removed', message: 'Envio via WhatsApp Cloud API foi descontinuado. Use o WhatsApp Web (QR) no webhook-ai.' });
});

export default router;

