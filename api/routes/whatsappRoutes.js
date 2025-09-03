import express from 'express';

const router = express.Router();

// Simple WhatsApp status endpoint (stub for dev)
// Later can be wired to Cloud API webhooks/state
router.get('/status', async (req, res) => {
  try {
    return res.json({ ok: true, connected: false, me: null });
  } catch (e) {
    // Nunca deve cair aqui, mas garanta 200 com stub em falha
    return res.json({ ok: true, connected: false, me: null });
  }
});

export default router;

