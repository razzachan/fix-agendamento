import express from 'express';
import { botAuth } from '../middleware/botAuth.js';
import fetch from 'node-fetch';

const router = express.Router();

const WEBHOOK_AI_BASE_URL = String(
  process.env.WEBHOOK_AI_BASE_URL || 'https://webhook-ai-docker-production.up.railway.app'
).replace(/\/$/, '');

// Usado para acessar endpoints /admin/* no webhook-ai sem expor x-admin-key ao Claude.
const WEBHOOK_AI_ADMIN_KEY = String(process.env.WEBHOOK_AI_ADMIN_KEY || '').trim();

function safeInt(v, fallback, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

async function forwardJson(url, { method = 'GET', headers = {}, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      accept: 'application/json',
      ...headers,
    },
    body,
  });

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  let parsed = null;
  if (contentType.includes('application/json')) {
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
  }

  return {
    ok: res.ok,
    status: res.status,
    contentType,
    text,
    json: parsed,
  };
}

// Proxy WhatsApp status from webhook-ai (requires BOT_TOKEN if configured)
router.get('/status', botAuth, async (_req, res) => {
  try {
    const upstream = await forwardJson(`${WEBHOOK_AI_BASE_URL}/whatsapp/status`);
    if (upstream.json) return res.status(upstream.status).json(upstream.json);
    return res.status(upstream.status).type('text/plain').send(upstream.text || '');
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'upstream_unreachable' });
  }
});

// Proxy send message via webhook-ai (WhatsApp Web)
// POST /api/whatsapp/send  { to: "5544..."|"5544...@c.us", body: "..." }
router.post('/send', botAuth, async (req, res) => {
  try {
    const { to, body } = req.body || {};
    if (!to || !body) {
      return res.status(400).json({ ok: false, error: 'missing_to_or_body' });
    }

    const upstream = await forwardJson(`${WEBHOOK_AI_BASE_URL}/whatsapp/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to, body }),
    });

    if (upstream.json) return res.status(upstream.status).json(upstream.json);
    return res.status(upstream.status).type('text/plain').send(upstream.text || '');
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'upstream_unreachable' });
  }
});

// Proxy list messages (from Supabase via webhook-ai admin endpoint)
// GET /api/whatsapp/messages?limit=50&channel=whatsapp&peer=...&direction=in|out&session_id=...
router.get('/messages', botAuth, async (req, res) => {
  try {
    if (!WEBHOOK_AI_ADMIN_KEY) {
      return res.status(503).json({ ok: false, error: 'missing_WEBHOOK_AI_ADMIN_KEY' });
    }

    const limit = safeInt(req.query.limit, 50, 1, 200);
    const channel = String(req.query.channel || '').trim();
    const peer = String(req.query.peer || '').trim();
    const direction = String(req.query.direction || '').trim();
    const session_id = String(req.query.session_id || '').trim();

    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    if (channel) qs.set('channel', channel);
    if (peer) qs.set('peer', peer);
    if (session_id) qs.set('session_id', session_id);
    if (direction === 'in' || direction === 'out') qs.set('direction', direction);

    const upstream = await forwardJson(`${WEBHOOK_AI_BASE_URL}/admin/messages?${qs.toString()}`, {
      headers: { 'x-admin-key': WEBHOOK_AI_ADMIN_KEY },
    });

    // Repasse direto do payload para manter compatibilidade com a API do webhook-ai
    if (upstream.json) return res.status(upstream.status).json(upstream.json);
    return res.status(upstream.status).type('text/plain').send(upstream.text || '');
  } catch (e) {
    return res.status(502).json({ ok: false, error: 'upstream_unreachable' });
  }
});

export default router;

