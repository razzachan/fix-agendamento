import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { whatsappRouter } from './routes/whatsapp.js';
import { aiPreviewRouter } from './routes/aiPreview.js';
import { pauseRouter } from './routes/pause.js';
import { runAdminSeedOnBoot } from './services/adminSeed.js';
import { getOrCreateSession } from './services/sessionStore.js';

const Env = z.object({
  PORT: z.string().default(process.env.PORT || '3100'),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // Removido: variáveis WABA
  OPENAI_API_KEY: z.string().optional(),
  WHATSAPP_ENABLED: z.string().optional(),
});

const env = Env.parse(process.env);

const app = express();
// Global middlewares BEFORE any routes (so CORS applies to all)
app.use(json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/ai', aiPreviewRouter);
app.use('/pause', pauseRouter);

// Test mode routes
app.get('/test-mode/status', (_req, res) => {
  import('./services/testMode.js')
    .then((m) => res.json(m.getTestModeStatus()))
    .catch(() => res.status(500).json({ error: true }));
});
app.post('/test-mode/enable', (_req, res) => {
  import('./services/testMode.js')
    .then((m) => {
      m.setTestModeEnabled(true);
      res.json({ ok: true });
    })
    .catch(() => res.status(500).json({ ok: false }));
});
app.post('/test-mode/disable', (_req, res) => {
  import('./services/testMode.js')
    .then((m) => {
      m.setTestModeEnabled(false);
      res.json({ ok: true });
    })
    .catch(() => res.status(500).json({ ok: false }));
});

// Raiz para teste rápido de conectividade (200 OK)
app.get('/', (_req, res) => {
  res.type('text/plain').send('Webhook AI OK');
});

app.get('/health', async (_req, res) => {
  try {
    let st: any = { connected: false, me: null, qr: null };
    try {
      const { waClient } = await import('./services/waClient.js');
      st = waClient.getStatus();
    } catch {}

    // ping leve ao supabase (sem depender do schema)
    let supa = 'unknown';
    let admin_ok: boolean | 'unknown' = 'unknown';
    let admin_count: number | null = null;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await sb.from('bot_sessions').select('id').limit(1);
      supa = error ? 'error' : 'ok';

      // health adicional: verificar admins
      try {
        const { data: admins, error: admErr } = await sb
          .from('users')
          .select('id')
          .eq('role', 'admin');
        if (!admErr && Array.isArray(admins)) {
          admin_count = admins.length;
          admin_ok = admins.length >= 1 ? true : false;
        } else {
          admin_ok = 'unknown';
        }
      } catch {
        admin_ok = 'unknown';
      }
    } catch {
      supa = 'error';
    }
    res.json({ status: 'ok', service: 'webhook-ai', whatsapp: st, supabase: supa, admin_ok, admin_count });
  } catch (e) {
    res.status(500).json({ status: 'error', message: String(e) });
  }
});

// Admin-only health with details (protected by x-admin-key)
app.get('/admin/health', async (req, res) => {
  try {
    const adminKey = process.env.ADMIN_API_KEY;
    const provided = String(req.headers['x-admin-key'] || '');
    if (!adminKey || provided !== adminKey) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const sb = createClient(url, key, { auth: { persistSession: false } });

    const { data: admins, error } = await sb
      .from('users')
      .select('id, email, role')
      .eq('role', 'admin');

    if (error) {
      return res.status(500).json({ ok: false, error: error.message || String(error) });
    }


    // Resolver admin alvo para handoff conforme variáveis de ambiente
    const PREF_ID = String(process.env.FIX_HANDOFF_ADMIN_ID || '').trim();
    const PREF_EMAIL = String(process.env.FIX_HANDOFF_EMAIL || '').trim();
    let selectedBy: 'env_admin_id' | 'env_email' | 'first_admin' | 'none' = 'none';
    let handoffTarget: { id: string; email?: string | null } | null = null;
    try {
      if (PREF_ID) {
        const { data: u } = await sb
          .from('users')
          .select('id, email, role')
          .eq('id', PREF_ID)
          .single();
        if (u && (u as any).role === 'admin') {
          handoffTarget = { id: (u as any).id, email: (u as any).email };
          selectedBy = 'env_admin_id';
        }
      }
      if (!handoffTarget && PREF_EMAIL) {
        const { data: u2 } = await sb
          .from('users')
          .select('id, email, role')
          .eq('email', PREF_EMAIL)
          .eq('role', 'admin')
          .single();
        if (u2) {
          handoffTarget = { id: (u2 as any).id, email: (u2 as any).email };
          selectedBy = 'env_email';
        }
      }
      if (!handoffTarget) {
        if (Array.isArray(admins) && admins.length > 0) {
          const a = admins[0] as any;
          handoffTarget = { id: a.id, email: a.email };
          selectedBy = 'first_admin';
        } else {
          selectedBy = 'none';
        }
      }
    } catch {}

    res.json({
      ok: true,
      admin_count: Array.isArray(admins) ? admins.length : 0,
      admins: Array.isArray(admins) ? admins : [],
      handoff_target: handoffTarget,
      handoff_selected_by: selectedBy,
      seed_disabled: process.env.ADMIN_SEED_DISABLE === 'true',
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Admin: últimas mensagens registradas (WhatsApp etc) via Supabase
// GET /admin/messages?limit=50&channel=whatsapp&peer=5548...&direction=in|out&session_id=...
app.get('/admin/messages', async (req, res) => {
  try {
    const adminKey = process.env.ADMIN_API_KEY;
    const provided = String(req.headers['x-admin-key'] || '');
    if (!adminKey || provided !== adminKey) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return res.status(500).json({ ok: false, error: 'missing_supabase_env' });
    }

    const limitRaw = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.trunc(limitRaw))) : 50;

    const channel = String(req.query.channel || '').trim();
    const peer = String(req.query.peer || '').trim();
    const session_id = String(req.query.session_id || '').trim();
    const direction = String(req.query.direction || '').trim();
    const dir = direction === 'in' || direction === 'out' ? (direction as 'in' | 'out') : null;

    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(url, key, { auth: { persistSession: false } });

    // Resolve session_id via channel+peer (se fornecidos)
    let effectiveSessionId = session_id || '';
    if (!effectiveSessionId && (channel || peer)) {
      let sessQ = sb.from('bot_sessions').select('id, channel, peer_id');
      if (channel) sessQ = sessQ.eq('channel', channel);
      if (peer) sessQ = sessQ.eq('peer_id', peer);
      const { data: sess, error: sessErr } = await sessQ.order('created_at', { ascending: false }).limit(1);
      if (sessErr) {
        return res.status(500).json({ ok: false, error: sessErr.message || String(sessErr) });
      }
      const s0: any = Array.isArray(sess) ? sess[0] : null;
      if (s0?.id) effectiveSessionId = String(s0.id);
    }

    let q = sb
      .from('bot_messages')
      .select('id, session_id, direction, body, meta, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (effectiveSessionId) q = q.eq('session_id', effectiveSessionId);
    if (dir) q = q.eq('direction', dir);

    const { data: msgs, error: msgErr } = await q;
    if (msgErr) {
      return res.status(500).json({ ok: false, error: msgErr.message || String(msgErr) });
    }

    const rows: any[] = Array.isArray(msgs) ? msgs : [];
    const sessionIds = Array.from(new Set(rows.map((r) => String(r.session_id)).filter(Boolean)));
    let sessionsById = new Map<string, { channel: string; peer_id: string }>();
    if (sessionIds.length > 0) {
      const { data: sessRows, error: sErr } = await sb
        .from('bot_sessions')
        .select('id, channel, peer_id')
        .in('id', sessionIds);
      if (!sErr && Array.isArray(sessRows)) {
        for (const s of sessRows as any[]) {
          sessionsById.set(String(s.id), { channel: String(s.channel), peer_id: String(s.peer_id) });
        }
      }
    }

    const enriched = rows.map((m) => {
      const s = sessionsById.get(String(m.session_id));
      return {
        id: m.id,
        created_at: m.created_at,
        direction: m.direction,
        body: m.body,
        session_id: m.session_id,
        channel: s?.channel || null,
        peer_id: s?.peer_id || null,
        meta: m.meta ?? null,
      };
    });

    res.json({ ok: true, limit, filters: { channel: channel || null, peer: peer || null, session_id: effectiveSessionId || null, direction: dir }, messages: enriched });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});


app.post('/restart', async (_req, res) => {
  try {
    res.json({ ok: true, message: 'Reiniciando webhook...' });
    console.log('[RESTART] Reiniciando processo em 1 segundo...');
    setTimeout(() => {
      process.exit(0); // O nodemon/tsx vai reiniciar automaticamente

    }, 1000);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Reset de sessão por peer (para testes e suporte)
app.post('/sessions/reset', async (req, res) => {
  try {
    // aceita via body ou query
    const peer = String(req.body?.peer || req.query?.peer || '').trim();
    const channel = String(req.body?.channel || req.query?.channel || 'whatsapp');
    if (!peer) return res.status(400).json({ ok: false, error: 'peer is required' });
    const { resetSessionStateByPeer } = await import('./services/sessionStore.js');
    await resetSessionStateByPeer(channel, peer);

    res.json({ ok: true, peer, channel });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});


// Limpar sessão do WhatsApp e forçar novo QR
app.post('/whatsapp/logout', async (_req, res) => {
  try {
    const { waClient } = await import('./services/waClient.js');
    await waClient.logout();
    await waClient.connect(true);
    res.json({ ok: true, message: 'Sessão do WhatsApp limpa. Leia o QR novamente.' });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});


// Endpoints de conexão via QR Code
app.use('/whatsapp', whatsappRouter);

// Endpoint de teste simples para verificar sessão
app.post('/test-session', async (req, res) => {
  try {
    const { from } = req.body || {};
    if (!from) return res.status(400).json({ error: 'Missing from' });

    console.log('[TEST-SESSION] Testando sessão para', from);
    const session = await getOrCreateSession('whatsapp', String(from));
    console.log('[TEST-SESSION] Sessão criada/recuperada:', session.id);

    res.json({ ok: true, from, session_id: session.id, state: session.state });
  } catch (e: any) {
    console.error('[TEST-SESSION] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
});

// Endpoint de teste para simular mensagem recebida
app.post('/test-message', async (req, res) => {
  try {
    const { from, body } = req.body || {};
    if (!from || !body) return res.status(400).json({ error: 'Missing from/body' });


    console.log('[TEST] Simulando mensagem recebida de', from, ':', body);

    // Logar nas tabelas de conversa para alimentar analytics
    try {
      const { logInbound } = await import('./services/conversation.js');
      await logInbound(from, String(body));
    } catch (e) {
      console.warn('[TEST] logInbound falhou (ok em dev):', (e as any)?.message || e);
    }

    // Importar e usar o orchestrator diretamente com sessão persistente
    const { orchestrateInbound } = await import('./services/conversationOrchestrator.js');
    const session = await getOrCreateSession('whatsapp', String(from));
    const reply = await orchestrateInbound(from, body, session);

    const preview =
      typeof reply === 'string' ? reply.slice(0, 200) : JSON.stringify(reply).slice(0, 200);
    console.log('[TEST] Resposta gerada:', preview);

    try {
      if (typeof reply === 'string') {
        const { logOutbound } = await import('./services/conversation.js');
        await logOutbound(from, reply);
      }
    } catch (e) {
      console.warn('[TEST] logOutbound falhou (ok em dev):', (e as any)?.message || e);
    }

    res.json({ ok: true, from, body, reply });
  } catch (e: any) {
    console.error('[TEST] Erro:', e);
    res.status(500).json({ error: true, message: e?.message || String(e) });
  }
});

// Endpoint de teste para simular mídia (imagem/áudio)
app.post('/test-media', async (req, res) => {
  try {
    const { from, mimetype, base64, caption } = req.body || {};
    if (!from || !mimetype || !base64) {
      return res.status(400).json({ ok: false, error: 'Missing from/mimetype/base64' });
    }

    // Analytics opcional
    try {
      const { logEvent } = await import('./services/analytics.js');
      await logEvent({ type: 'media:received', from, channel: 'whatsapp', data: { mimetype, bytes: base64.length } });
    } catch {}

    // Log inbound simplificado
    try {
      const { logInbound } = await import('./services/conversation.js');
      await logInbound(from, `[${mimetype}] ${caption || ''}`.trim());
    } catch {}

    const { getOrCreateSession, setSessionState } = await import('./services/sessionStore.js');
    const { orchestrateInbound } = await import('./services/conversationOrchestrator.js');
    const session = await getOrCreateSession('whatsapp', String(from));

    let result: any = { ok: true, from, mimetype };

    if (String(mimetype).startsWith('audio/')) {
      try {
        const { transcribeAudio } = await import('./services/llmClient.js');
        const transcript = await transcribeAudio({ mimeType: mimetype, base64 });
        result.transcript = transcript;
        try { const { logEvent } = await import('./services/analytics.js'); await logEvent({ type: 'media:audio:transcribed', session_id: session.id, from, channel: 'whatsapp', data: { length: transcript?.length || 0 } }); } catch {}

        if (transcript && transcript.trim()) {
          const reply = await orchestrateInbound(from, transcript, session);
          result.reply = reply;
        }
      } catch (e) {
        result.error = String((e as any)?.message || e);
        try { const { logEvent } = await import('./services/analytics.js'); await logEvent({ type: 'media:audio:transcribe_error', from, channel: 'whatsapp', data: { error: result.error } }); } catch {}
      }
      return res.json(result);
    }

    if (String(mimetype).startsWith('image/')) {
      // Classificação via API local (se disponível)
      let classificationResult: any = null;
      try {
        const base = process.env.API_URL || 'http://localhost:3001';
        const headers: any = { 'Content-Type': 'application/json' };
        if (process.env.BOT_TOKEN) headers['x-bot-token'] = process.env.BOT_TOKEN;
        const resp = await fetch(`${base}/api/vision/classify-stove`, {
          method: 'POST', headers, body: JSON.stringify({ imageBase64: `data:${mimetype};base64,${base64}` })
        });
        const data = await resp.json().catch(() => null);
        if (resp.ok && data?.ok && ((data?.type && data.type !== 'indeterminado') || (data?.segment && data.segment !== 'indeterminado'))) {
          classificationResult = { segment: data.segment, type: data.type, confidence: data.confidence, source: 'api' };
        }
      } catch {}

      // Fallback: GPT-4o Vision
      if (!classificationResult) {
        try {
          const { chatComplete } = await import('./services/llmClient.js');
          const imageData = `data:${mimetype};base64,${base64}`;
          const prompt = 'Analise esta imagem de fogão e responda APENAS com um JSON no formato: {"type": "floor|cooktop|indeterminado", "segment": "basico|inox|premium|indeterminado", "burners": "4|5|6|indeterminado"}.';
          const visionResponse = await chatComplete(
            { provider: 'openai', model: process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini' },
            [
              { role: 'system', content: 'Você é um assistente de visão especializado em eletrodomésticos.' },
              { role: 'user', content: [ { type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageData } } ] as any }
            ]
          );
          const cleaned = String(visionResponse || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
          const visionData = JSON.parse(cleaned || '{}');
          classificationResult = {
            segment: visionData.segment || 'indeterminado',
            type: visionData.type || 'indeterminado',
            burners: visionData.burners || 'indeterminado',
            confidence: 0.8,
            source: 'gpt4o-vision'
          };
        } catch (e) {
          result.vision_error = String((e as any)?.message || e);
        }
      }

      if (classificationResult) {
        result.classification = classificationResult;
        try { const { logEvent } = await import('./services/analytics.js'); await logEvent({ type: 'media:image:classified', from, channel: 'whatsapp', data: classificationResult }); } catch {}
      }

      // Detecção geral de equipamento via LLM (UX): equip + mount
      try {
        const { chatComplete } = await import('./services/llmClient.js');
        const imageData = `data:${mimetype};base64,${base64}`;
        const resp = await chatComplete(
          { provider: 'openai', model: process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini' },
          [
            { role: 'system', content: 'Você é um assistente de visão que identifica rapidamente o equipamento e o tipo de instalação.' },
            { role: 'user', content: [
              { type: 'text', text: 'Olhe a imagem e responda APENAS com JSON: {"equipamento":"fogão|cooktop|outro|indeterminado","mount":"piso|embutido|indeterminado"}.' },
              { type: 'image_url', image_url: { url: imageData } }
            ] as any }
          ]
        );
        const cleaned = String(resp || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed: any = JSON.parse(cleaned || '{}');
        const equip = String(parsed?.equipamento || '').toLowerCase();
        const mount = String(parsed?.mount || '').toLowerCase();

        if (equip && equip !== 'indeterminado') {
          const st = session.state || {} as any;
          st.dados_coletados = st.dados_coletados || {};
          if (!st.dados_coletados.equipamento) st.dados_coletados.equipamento = equip;
          if (mount && mount !== 'indeterminado' && !st.dados_coletados.mount) st.dados_coletados.mount = mount;
          await setSessionState(session.id, st);

          const ack = `Recebi a foto! Parece um ${equip}${mount && mount !== 'indeterminado' ? ` de ${mount}` : ''}. Se puder, me diga a marca e um breve descritivo do problema.`;
          result.ack = ack;
        }
      } catch {}

      return res.json(result);
    }

    return res.status(400).json({ ok: false, error: 'Unsupported mimetype (use image/* ou audio/*)' });
  } catch (e: any) {
    console.error('[TEST] Erro /test-media:', e);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});


// Endpoint para simular mensagem real do seu número
app.post('/test-real-message', async (req, res) => {
  try {
    const { message } = req.body || {};
    const messageText = message || 'teste real';

    // Simular seu número real (você pode ajustar este número)
    const yourRealNumber = '5548999888777@c.us';


    console.log(`[TEST] 📱 Simulando mensagem REAL de ${yourRealNumber} : ${messageText}`);

    // Logar nas tabelas de conversa
    try {
      const { logInbound } = await import('./services/conversation.js');
      await logInbound(yourRealNumber, String(messageText));
    } catch (e) {
      console.warn('[TEST] logInbound falhou (ok em dev):', (e as any)?.message || e);
    }

    // Processar através do roteamento de IA
    const { orchestrateInbound } = await import('./services/conversationOrchestrator.js');
    const reply = await orchestrateInbound(yourRealNumber, messageText);

    // Log da resposta
    const preview =
      typeof reply === 'string' ? reply.slice(0, 200) : JSON.stringify(reply).slice(0, 200);
    console.log('[TEST] 📱 Resposta para mensagem real:', preview);

    try {
      if (typeof reply === 'string') {
        const { logOutbound } = await import('./services/conversation.js');
        await logOutbound(yourRealNumber, reply);
      }
    } catch (e) {
      console.warn('[TEST] logOutbound falhou (ok em dev):', (e as any)?.message || e);
    }

    res.json({
      ok: true,
      from: yourRealNumber,
      message: messageText,
      reply: reply,
      note: '📱 Simulação de mensagem real - Bot funcionando perfeitamente!',
    });
  } catch (error) {
    console.error('[TEST] Erro ao simular mensagem real:', error);
    res.status(500).json({ error: String(error) });
  }
});

app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: true, message: 'Internal Server Error' });
});

app.listen(Number(env.PORT), '0.0.0.0', async () => {
  console.log(`Webhook AI listening on :${env.PORT} - CHROMIUM SYSTEM FIX APPLIED`);

  const whatsappEnabled = String(process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() !== 'false';

  // Inicializar admin seed em background (não bloquear o servidor)
  runAdminSeedOnBoot().catch(e => console.warn('[ADMIN] Seed failed:', e));

  // Inicializar WhatsApp client em background (não bloquear o servidor)
  if (!whatsappEnabled) {
    console.log('[WA] Disabled by WHATSAPP_ENABLED=false; skipping WhatsApp initialization');
    return;
  }
  setTimeout(async () => {
    try {
      console.log('[WA] Starting WhatsApp client...');
      const { waClient } = await import('./services/waClient.js');
      const { setupWAInboundAdapter } = await import('./services/waAdapter.js');
      await waClient.start();
      setupWAInboundAdapter();
      console.log('[WA] Client initialized successfully (force redeploy)');
    } catch (e) {
      console.error('[WA] init error', e);
      // Tentar novamente em 30 segundos
      setTimeout(async () => {
        try {
          console.log('[WA] Retrying WhatsApp client initialization...');
          const { waClient } = await import('./services/waClient.js');
          const { setupWAInboundAdapter } = await import('./services/waAdapter.js');
          await waClient.start();
          setupWAInboundAdapter();
          console.log('[WA] Client initialized on retry');
        } catch (retryError) {
          console.error('[WA] Retry failed:', retryError);
        }
      }, 30000);
    }
  }, 5000); // Aguardar 5 segundos após o servidor estar rodando
});
