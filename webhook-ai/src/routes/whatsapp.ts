import { Router } from 'express';
import { waClient } from '../services/waClient.js';

export const whatsappRouter = Router();

function isWhatsAppEnabled() {
  return String(process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false';
}

function requireEnabled(res: any) {
  if (!isWhatsAppEnabled()) {
    res.status(503).json({ ok: false, error: 'whatsapp_disabled' });
    return false;
  }
  return true;
}

whatsappRouter.get('/status', (_req, res) => {
  res.json({ enabled: isWhatsAppEnabled(), ...waClient.getStatus() });
});

// Retorna QR code como dataURL
whatsappRouter.get('/qr', (_req, res) => {
  if (!requireEnabled(res)) return;
  const st = waClient.getStatus();
  if (st.qr) return res.json({ qr: st.qr });
  return res.status(204).end();
});
// Exibe o QR como página HTML simples
whatsappRouter.get('/qr-image', (_req, res) => {
  if (!requireEnabled(res)) return;
  const st = waClient.getStatus();
  if (!st.qr) return res.status(204).end();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  const html = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>QR do WhatsApp</title>
    <style>
      html,body{height:100%;margin:0;display:flex;align-items:center;justify-content:center;background:#111;color:#eee;font-family:system-ui,Arial}
      img{width:320px;height:320px;image-rendering: pixelated;border-radius:8px;border:1px solid #333;background:#fff}
    </style>
  </head>
  <body>
    <img src="${st.qr}" alt="QR" />
  </body>
</html>`;
  res.send(html);
});

whatsappRouter.post('/reset', async (_req, res) => {
  if (!requireEnabled(res)) return;
  await waClient.reset();
  res.json({ ok: true });
});

whatsappRouter.post('/logout', async (_req, res) => {
  if (!requireEnabled(res)) return;
  await waClient.logout();
  res.json({ ok: true });
});

// GET version for easy browser testing
whatsappRouter.get('/connect', async (req, res) => {
  if (!requireEnabled(res)) return;
  const force = String(req.query.force || '').toLowerCase() === 'true';
  res.status(202).json({ ok: true, force, started: true });
  // Start connection in background to avoid timeout
  setTimeout(() => waClient.connect(force).catch(e => console.error('[WA] connect error', e)), 0);
});

whatsappRouter.post('/connect', async (req, res) => {
  if (!requireEnabled(res)) return;
  const force = String(req.query.force || '').toLowerCase() === 'true';
  res.status(202).json({ ok: true, force, started: true });
  // Start connection in background to avoid timeout
  setTimeout(() => waClient.connect(force).catch(e => console.error('[WA] connect error', e)), 0);
});

// Debug: enviar texto manualmente
whatsappRouter.post('/send', async (req, res) => {
  try {
    if (!requireEnabled(res)) return;
    const { to, body } = req.body || {};
    if (!to || !body) return res.status(400).json({ error: 'Missing to/body' });
    // Normaliza número: remove tudo que não for dígito e força @c.us
    let raw = String(to);
    const digits = raw.replace(/\D+/g, '');
    let jid = digits ? `${digits}@c.us` : raw;
    if (!/@/.test(jid)) jid = `${jid}@c.us`;
    const { assertSendAllowedInTestMode } = await import('../services/testMode.js');
    assertSendAllowedInTestMode(jid);
    await waClient.sendText(jid, String(body));
    res.json({ ok: true, to: jid });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
});

// GET helper for quick manual tests: /whatsapp/send?to=554498...&body=Oi
whatsappRouter.get('/send', async (req, res) => {
  try {
    if (!requireEnabled(res)) return;
    const to = req.query.to as string;
    const body = req.query.body as string;
    if (!to || !body) return res.status(400).json({ error: 'Missing to/body' });
    let raw = String(to);
    const digits = raw.replace(/\D+/g, '');
    let jid = digits ? `${digits}@c.us` : raw;
    if (!/@/.test(jid)) jid = `${jid}@c.us`;
    const { assertSendAllowedInTestMode } = await import('../services/testMode.js');
    assertSendAllowedInTestMode(jid);
    await waClient.sendText(jid, String(body));
    res.json({ ok: true, to: jid });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
});

// Reset WhatsApp para forçar novo QR
whatsappRouter.post('/reset', async (_req, res) => {
  try {
    if (!requireEnabled(res)) return;
    await waClient.reset();
    res.json({ success: true, message: 'WhatsApp resetado, novo QR será gerado' });
  } catch (e: any) {
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
});
