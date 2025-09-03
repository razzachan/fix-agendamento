import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import { z } from 'zod';
import { whatsappRouter } from './routes/whatsapp.js';
import { aiPreviewRouter } from './routes/aiPreview.js';
import { pauseRouter } from './routes/pause.js';
import { waClient } from './services/waClient.js';
import { setupWAInboundAdapter } from './services/waAdapter.js';
import { getOrCreateSession } from './services/sessionStore.js';

const Env = z.object({
  PORT: z.string().default('3100'),
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  // Removido: variáveis WABA
  OPENAI_API_KEY: z.string().optional(),
});

const env = Env.parse(process.env);

const app = express();
// Global middlewares BEFORE any routes (so CORS applies to all)
app.use(json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/ai', aiPreviewRouter);
app.use('/pause', pauseRouter);

// Test mode routes
app.get('/test-mode/status', (_req, res) => {
  import('./services/testMode.js').then(m => res.json(m.getTestModeStatus())).catch(()=>res.status(500).json({error:true}));
});
app.post('/test-mode/enable', (_req, res) => {
  import('./services/testMode.js').then(m => { m.setTestModeEnabled(true); res.json({ ok: true }); }).catch(()=>res.status(500).json({ok:false}));
});
app.post('/test-mode/disable', (_req, res) => {
  import('./services/testMode.js').then(m => { m.setTestModeEnabled(false); res.json({ ok: true }); }).catch(()=>res.status(500).json({ok:false}));
});


app.get('/health', async (_req, res) => {
  try {
    const st = waClient.getStatus();
    // ping leve ao supabase (sem depender do schema)
    let supa = 'unknown';
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const url = process.env.SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const sb = createClient(url, key, { auth: { persistSession: false } });
      const { error } = await sb.from('bot_sessions').select('id').limit(1);
      supa = error ? 'error' : 'ok';
    } catch { supa = 'error'; }
    res.json({ status: 'ok', service: 'webhook-ai', whatsapp: st, supabase: supa });
  } catch (e) {
    res.status(500).json({ status: 'error', message: String(e) });
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

// Endpoints de conexão via QR Code
app.use('/whatsapp', whatsappRouter);

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
    const session = await getOrCreateSession('wa', String(from));
    const reply = await orchestrateInbound(from, body, session);

    const preview = typeof reply === 'string' ? reply.slice(0, 200) : JSON.stringify(reply).slice(0, 200);
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
    const preview = typeof reply === 'string' ? reply.slice(0, 200) : JSON.stringify(reply).slice(0, 200);
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
      note: '📱 Simulação de mensagem real - Bot funcionando perfeitamente!'
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
  console.log(`Webhook AI listening on :${env.PORT} - NOTES CORRECTION APPLIED`);
  try {
    await waClient.start();
    setupWAInboundAdapter();
    console.log('[WA] Client initialized');
  } catch (e) {
    console.error('[WA] init error', e);
  }
});

