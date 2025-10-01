import { waClient } from './waClient.js';
import { processFAQ } from './modules/faq.js';
import { processGarantia } from './modules/garantia.js';
import { processStatus } from './modules/status.js';
import { processFeedback } from './modules/feedback.js';
import { tryHandleByFlows } from './flowEngine.js';
import { orchestrateInbound } from './conversationOrchestrator.js';
import { getOrCreateSession, logMessage } from './sessionStore.js';


// Feature flags para controlar mensagens proativas (política atual: reativo por padrão)
// Mantemos a leitura das envs, mas adicionamos um safe-guard para não reengajar durante troca de contexto
const REENGAGE_ENABLED = (process.env.WA_ENABLE_REENGAGE || 'false').toLowerCase() === 'true';
const GREETING_ENABLED = (process.env.WA_ENABLE_GREETING || 'false').toLowerCase() === 'true';

function looksLikeConfirmation(text: string) {
  const t = text.toLowerCase();
  // Aceitação ampla, mas só será usada se tivermos dados mínimos (marca+problema) no estado
  return /\b(confirmo|confirmar agendamento|quero fechar|vamos agendar|pode agendar|pode marcar|fechado|fechou|ok,? pode|sim,? pode|vamos fechar)\b/.test(t);
}

// Heurística leve para “troca de contexto” explícita
function looksLikeContextSwitch(norm: string) {
  return /^(novo atendimento|outro atendimento|novo orcamento|novo orçamento|outro problema|mudar (de )?assunto|trocar (de )?assunto|come[çc]ar (do zero|de novo)|iniciar atendimento|resetar( atendimento)?|come[çc]ar novamente|novo caso|novo servico|atendimento novo)$/.test(
    norm
  );
}
// Anti-duplicação simples: evita processar a mesma mensagem duas vezes em poucos segundos
const __recentMessages = new Map<string, number>(); // key = from::text, value = timestamp ms


// Guard local para suprimir saídas idênticas em janela curta (mesmo processo)
const __recentOut = new Map<string, Array<{ body: string; at: number }>>();
function __isRecentOut(sessionId: string, body: string, windowMs = 8000){
  const arr = __recentOut.get(sessionId) || [];
  const now = Date.now();
  return arr.some(it => it.body === body && (now - it.at) < windowMs);
}
function __markOut(sessionId: string, body: string){
  const arr = __recentOut.get(sessionId) || [];
  arr.push({ body, at: Date.now() });
  while (arr.length > 10) arr.shift();
  __recentOut.set(sessionId, arr);
}


// Lock por inbound: garante no mio prazo (1.5s) apenas uma resposta por mensagem recebida
const __inboundLocks = new Map<string, { key?: string; firstSentAt: number; sentCount: number }>();
const REPLY_COOLDOWN_MS = Number(process.env.REPLY_COOLDOWN_MS || 5000);

function __inboundKey(meta?: { id?: string }){ return meta?.id ? String(meta.id) : undefined; }
function __markInbound(sessionId: string, meta?: { id?: string }){
  const key = __inboundKey(meta) || `ts:${Date.now()}`;
  __inboundLocks.set(sessionId, { key, firstSentAt: 0, sentCount: 0 });
}
async function sendTextOnce(sessionId: string, to: string, text: string, meta?: { id?: string }){
  const key = __inboundKey(meta) || `ts:${Date.now()}`;
  const lock = __inboundLocks.get(sessionId);
  const now = Date.now();

  // 0) Guard local: evita repetir MESMO texto em janela curta (mesmo processo)
  if (__isRecentOut(sessionId, text)) {
    console.warn('[Adapter] local-guard: suprimindo duplicata (text)');
    return;
  }

  // 1) Guarda distribuída via DB: evita duplicata cross-process nos últimos 8s
  try {
    const { supabase } = await import('./supabase.js');
    const sinceISO = new Date(Date.now() - 8000).toISOString();
    const { data: dup } = await supabase
      .from('bot_messages')
      .select('id')
      .eq('session_id', sessionId)
      .eq('direction', 'out')
      .eq('body', text)
      .gte('created_at', sinceISO)
      .limit(1);
    if (Array.isArray(dup) && dup.length) {
      console.warn('[Adapter] DB-guard: suprimindo duplicata (text)');
      return;
    }
  } catch {}

  if (lock && lock.key === key && lock.sentCount >= 1 && now - lock.firstSentAt < 1500){
    console.warn('[Adapter] suprimindo double reply (text) para inbound', key);
    return;
  }
  if (lock && lock.key === key && lock.sentCount >= 1 && now - (lock.firstSentAt || now) < REPLY_COOLDOWN_MS){
    console.warn('[Adapter] suprimindo reply por cooldown (mesmo inbound) por', REPLY_COOLDOWN_MS, 'ms');
    return;
  }
  if (!lock || lock.key !== key) __inboundLocks.set(sessionId, { key, firstSentAt: now, sentCount: 1 });
  else { if (lock.sentCount === 0) lock.firstSentAt = now; lock.sentCount++; }
  await waClient.sendText(to, text);
  await logMessage(sessionId, 'out', text);
__markOut(sessionId, text);

}

async function sendButtonsOnce(sessionId: string, to: string, text: string, options: Array<{ id: string; text: string }>, meta?: { id?: string }){
  const key = __inboundKey(meta) || `ts:${Date.now()}`;
  const lock = __inboundLocks.get(sessionId);

  // 0) Guard local: evita repetir MESMO texto (buttons) em janela curta
  if (__isRecentOut(sessionId, text)) {
    console.warn('[Adapter] local-guard: suprimindo duplicata (buttons)');
    return;
  }

  const now = Date.now();

  // 0) Guarda distribuída via DB (bot_messages): evita duplicata cross-process nos últimos 8s
  try {
    const { supabase } = await import('./supabase.js');
    const sinceISO = new Date(Date.now() - 8000).toISOString();
    const { data: dup } = await supabase
      .from('bot_messages')
      .select('id')
      .eq('session_id', sessionId)
      .eq('direction', 'out')
      .eq('body', text)
      .gte('created_at', sinceISO)
      .limit(1);
    if (Array.isArray(dup) && dup.length) {
      console.warn('[Adapter] DB-guard: suprimindo duplicata (buttons)');
      return;
    }
  } catch {}

  if (lock && lock.key === key && lock.sentCount >= 1 && now - lock.firstSentAt < 1500){
    console.warn('[Adapter] suprimindo double reply (buttons) para inbound', key);
    return;
  }
  if (lock && lock.key === key && lock.sentCount >= 1 && now - (lock.firstSentAt || now) < REPLY_COOLDOWN_MS){
    console.warn('[Adapter] suprimindo reply(buttons) por cooldown (mesmo inbound) por', REPLY_COOLDOWN_MS, 'ms');
    return;
  }
  if (!lock || lock.key !== key) __inboundLocks.set(sessionId, { key, firstSentAt: now, sentCount: 1 });
  else { if (lock.sentCount === 0) lock.firstSentAt = now; lock.sentCount++; }
  await waClient.sendButtons(to, text, options);
  await logMessage(sessionId, 'out', text + ' [buttons]');
__markOut(sessionId, text);

}

let __inboundSetupDone = false;

export async function setupWAInboundAdapter() {
  if (__inboundSetupDone) {
    console.log('[Adapter] 🔧 Setup já foi feito, pulando...');
    return; // evitar listeners duplicados em hot reload
  }
  console.log('[Adapter] 🔧 Iniciando setup do adapter...');
  __inboundSetupDone = true;
  const asWebhookBody = (from: string, text: string) => ({
    entry: [
      {
        changes: [
          {
            value: {
              messages: [{ from, type: 'text', text: { body: text } }],
            },
          },
        ],
      },
    ],
  });

  const { isGloballyPaused } = await import('./pause.js');
  // Listener para mensagens with mídia (classificação visual)

  waClient.onAnyMessage(async (msg: any, meta?: { id?: string; ts?: number; type?: string }) => {
    try {
      if (!msg || !msg.hasMedia) return;
      let media = null as any;
      try {
        media = await msg.downloadMedia?.();
      } catch (err) {
        console.warn('[Adapter] Falha no downloadMedia(), tentando novamente em 500ms...', err);
        await new Promise((r) => setTimeout(r, 500));
        try {
          media = await msg.downloadMedia?.();
        } catch {}
      }

      // Guard de ID único por mensagem (mídia): evita reprocessar mesma mídia em reconexões
      try {
        const metaId = meta?.id as string | undefined;
        if (metaId) {
          const keyId = `id::${metaId}`;
          const lastId = __recentMessages.get(keyId) || 0;
          const nowId = Date.now();
          if (nowId - lastId < 60 * 1000) {
            console.warn('[Adapter] (media) Ignorando duplicata por ID:', metaId);
            return;
          }
          __recentMessages.set(keyId, nowId);
        }
      } catch {}

      if (!media || !media.mimetype) return;


      // Analytics: mídia recebida
      try {
        const { logEvent } = await import('./analytics.js');
        await logEvent({ type: 'media:received', from: msg.from, channel: 'whatsapp', data: { mimetype: media.mimetype, bytes: (media.data?.length || 0) } });
      } catch {}

      // Áudio: transcrever e passar pelo orquestrador
      if (media.mimetype.startsWith('audio/')) {
        // Ignorar áudios de grupos do WhatsApp (@g.us)
        if (msg.from.endsWith('@g.us')) {
          console.log('[Adapter] Ignorando áudio de grupo:', msg.from);
          return;
        }

        try {
          const { transcribeAudio } = await import('./llmClient.js');
          const transcript = await transcribeAudio({ mimeType: media.mimetype, base64: media.data });
          if (transcript && transcript.trim()) {
            try { const { logEvent } = await import('./analytics.js'); await logEvent({ type: 'media:audio:transcribed', session_id: (await (await import('./sessionStore.js')).getOrCreateSession('whatsapp', msg.from)).id, from: msg.from, channel: 'whatsapp', data: { length: transcript.length } }); } catch {}
            const { getOrCreateSession } = await import('./sessionStore.js');
            const session = await getOrCreateSession('whatsapp', msg.from);
            try { __markInbound(session.id, meta as any); } catch {}
            const reply = await orchestrateInbound(msg.from, transcript, session);
            if (reply) {
              let outText: string;
              if (typeof reply === 'string') outText = reply;
              else outText = JSON.stringify(reply);
              await sendTextOnce(session.id, msg.from, outText, meta as any);
            }
          }
        } catch (e) {
          console.error('[Adapter] Erro na transcrição de áudio:', e);
          try { const { logEvent } = await import('./analytics.js'); await logEvent({ type: 'media:audio:transcribe_error', from: msg.from, channel: 'whatsapp', data: { error: String((e as any)?.message || e) } }); } catch {}
        }
        return;
      }

      // Imagens
      if (!media.mimetype.startsWith('image/')) return;

      // Ignorar imagens de status@broadcast (stories do WhatsApp)
      if (msg.from === 'status@broadcast') {
        console.log('[Adapter] Ignorando imagem de status@broadcast');
        return;
      }

      // Ignorar imagens de grupos do WhatsApp (@g.us)
      if (msg.from.endsWith('@g.us')) {
        console.log('[Adapter] Ignorando imagem de grupo:', msg.from);
        return;
      }

      // Ignorar imagens do próprio bot (evitar auto-loop) - FIXED
      if (msg.fromMe) {
        console.log('[Adapter] Ignorando imagem do próprio bot (fromMe=true):', msg.from);
        return;
      }

      console.log('[Adapter] Imagem recebida de', msg.from, '→ classificando...');

      const { getOrCreateSession, setSessionState } = await import('./sessionStore.js');
      const session = await getOrCreateSession('whatsapp', msg.from);


      // Marcar início de inbound para lock de resposta única
      try { __markInbound(session.id, meta as any); } catch {}

      let classificationResult = null;

      // Tentativa 1: API local de classificação
      try {
        const base = process.env.API_URL || 'http://localhost:3001';
        const headers: any = { 'Content-Type': 'application/json' };
        if (process.env.BOT_TOKEN) headers['x-bot-token'] = process.env.BOT_TOKEN;
        const resp = await fetch(`${base}/api/vision/classify-stove`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ imageBase64: `data:${media.mimetype};base64,${media.data}` }),
        });
        const data = await resp.json().catch(() => null);
        if (
          resp.ok &&
          data?.ok &&
          ((data?.type && data.type !== 'indeterminado') ||
            (data?.segment && data.segment !== 'indeterminado'))
        ) {
          classificationResult = {
            segment: data.segment,
            type: data.type,
            confidence: data.confidence,
            source: 'api',
          };
          console.log('[Adapter] Classificação via API:', classificationResult);
          try { const { logEvent } = await import('./analytics.js'); await logEvent({ type: 'media:image:classified', from: msg.from, channel: 'whatsapp', data: classificationResult }); } catch {}

        } else {
          console.log(
            '[Adapter] API retornou resultado indeterminado ou inválido, tentando GPT-4o Vision...'
          );
        }
      } catch (apiError) {
        console.log('[Adapter] API indisponível, tentando GPT-4o Vision...');
      }

      // Tentativa 2: GPT-4o Vision como fallback
      if (!classificationResult) {
        try {
          const { chatComplete } = await import('./llmClient.js');
          const imageData = `data:${media.mimetype};base64,${media.data}`;

          const visionResponse = await chatComplete(
            {
              provider: 'openai',
              model: 'gpt-4o',
              temperature: 0.1,
              maxTokens: 300,
            },
            [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analise esta imagem de fogão e responda APENAS com um JSON no formato: {"type": "floor|cooktop|indeterminado", "segment": "basico|inox|premium|indeterminado", "burners": "4|5|6|indeterminado"}. Critérios: type=floor se for fogão de piso, cooktop se for cooktop/embutido. segment=basico se for simples/branco, inox se for inox, premium se for vidro/moderno. burners=número de bocas visíveis.',
                  },
                  {
                    type: 'image_url',
                    image_url: { url: imageData },
                  },
                ],
              },
            ]
          );

          // Alguns modelos retornam bloco de código (```json ... ```). Sanitizar antes do parse.
          const cleaned = String(visionResponse || '')
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/```\s*$/i, '')
            .trim();
          const visionData = JSON.parse(cleaned || '{}');
          classificationResult = {
            segment: visionData.segment || 'indeterminado',
            type: visionData.type || 'indeterminado',
            burners: visionData.burners || 'indeterminado',
            confidence: 0.8,
            source: 'gpt4o-vision',
          };
          console.log('[Adapter] Classificação via GPT-4o Vision:', classificationResult);


          try { const { logEvent } = await import('./analytics.js'); await logEvent({ type: 'media:image:classified', from: msg.from, channel: 'whatsapp', data: classificationResult }); } catch {}

      // Detec e7 e3o geral de equipamento via GPT-4o (melhor UX ap f3s foto)
      try {
        const { chatComplete } = await import('./llmClient.js');
        const imageData = `data:${media.mimetype};base64,${media.data}`;
        const resp = await chatComplete(
          { provider: 'openai', model: process.env.LLM_OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.1, maxTokens: 200 },
          [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Identifique o equipamento na imagem e retorne APENAS JSON: {"equipamento":"fog e3o|forno|micro-ondas|geladeira|lava-lou e7as|lavadora|secadora|coifa|adega|indeterminado","mount":"bancada|embutido|piso|indeterminado"}.' },
                { type: 'image_url', image_url: { url: imageData } },
              ],
            },
          ]
        );
        const cleaned = String(resp || '').replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
        const parsed: any = JSON.parse(cleaned || '{}');
        const equip = String(parsed?.equipamento || '').toLowerCase();
        const mount = String(parsed?.mount || '').toLowerCase();

        if (equip && equip !== 'indeterminado') {
          const { setSessionState } = await import('./sessionStore.js');
          const st = session.state || {};
          st.dados_coletados = st.dados_coletados || {};
          if (!st.dados_coletados.equipamento) st.dados_coletados.equipamento = equip;
          if (mount && mount !== 'indeterminado' && !st.dados_coletados.mount) st.dados_coletados.mount = mount;
          await setSessionState(session.id, st);

          // Responde proativamente com ack s f3 fora do modo de teste
          if (process.env.NODE_ENV !== 'test') {
            const ack = `Recebi a foto! Parece um ${equip}${mount && mount !== 'indeterminado' ? ` de ${mount}` : ''}. Se puder, me diga a marca e um breve descritivo do problema.`;
            // Debounce do ACK de mídia: aguarda ~700ms e só envia se nenhuma outra resposta saiu
            await new Promise((r) => setTimeout(r, 700));
            const lk = __inboundLocks.get(session.id);
            if (!lk || lk.sentCount === 0) {
              await sendTextOnce(session.id, msg.from, ack, meta as any);
              try { const { logEvent } = await import('./analytics.js'); await logEvent({ type: 'media:image:ack_sent', session_id: session.id, from: msg.from, channel: 'whatsapp' }); } catch {}
            } else {
              try { const { logEvent } = await import('./analytics.js'); await logEvent({ type: 'media:image:ack_suppressed', session_id: session.id, from: msg.from, channel: 'whatsapp' }); } catch {}
            }
          }
        }
      } catch (e) {
        console.log('[Adapter] Deteccao geral de equipamento falhou (opcional):', String(e));
      }


        } catch (visionError) {
          console.error('[Adapter] Erro na classificação por visão:', visionError);
        }
      }

      // Salvar resultado na sessão
      if (classificationResult) {
        const st = session.state || {};
        st.visual_segment = classificationResult.segment;
        st.visual_type = classificationResult.type;
        st.visual_burners = classificationResult.burners;
        st.visual_confidence = classificationResult.confidence;
        st.visual_source = classificationResult.source;

        await setSessionState(session.id, st);
        console.log('[Adapter] Classificação salva na sessão:', st);
      }
    } catch (e) {
      console.error('[Adapter] Erro ao processar imagem', e);
    }
  });

  waClient.onMessage(async (from, body, meta?: { id?: string; ts?: number; type?: string }) => {
    const text = (body || '').trim();
    console.log('[Adapter] Mensagem recebida de', from, 'texto:', text);

    // Ignora eventos sem texto (mídia sem legenda) — já tratados em onAnyMessage
    if (!text) {
      console.log('[Adapter] Ignorando onMessage vazio (provável mídia sem legenda) de', from);
      return;
    }


    // Ignorar mensagens de status@broadcast (stories do WhatsApp)
    if (from === 'status@broadcast') {
      console.log('[Adapter] Ignorando mensagem de status@broadcast');
      return;
    }

    // Ignorar mensagens de grupos do WhatsApp (@g.us)
    if (from.endsWith('@g.us')) {
      console.log('[Adapter] Ignorando mensagem de grupo:', from);
      return;
    }

    // Nota: Não precisamos verificar fromMe aqui pois o onMessage só recebe mensagens de outros usuários

    // Comandos rápidos de pausa por conversa
    if (text === "'") {
      // pausa
      const session = await getOrCreateSession('whatsapp', from);
      const st = { ...(session.state || {}), paused: true };
      await (await import('./sessionStore.js')).setSessionState(session.id, st);
      await sendTextOnce(session.id, from, 'Bot pausado para esta conversa. Envie = para reativar.', meta as any);
      return;
    }
    if (text === '=') {
      // despausa
      const session = await getOrCreateSession('whatsapp', from);
      const st = { ...(session.state || {}), paused: false };
      await (await import('./sessionStore.js')).setSessionState(session.id, st);
      await sendTextOnce(session.id, from, 'Bot reativado para esta conversa.', meta as any);
      return;
    }

    // Silêncio total quando a última config não estiver publicada
    const { supabase } = await import('./supabase.js');
    const { data: last } = await supabase
      .from('bot_configs')
      .select('status')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Guard por ID específico do WhatsApp (texto): evita reprocessar a mesma mensagem por reconexões
    try {
      const metaId = (arguments as any)?.[2]?.id as string | undefined;
      if (metaId) {
        const keyId = `id::${metaId}`;
        const lastId = __recentMessages.get(keyId) || 0;
        const nowId = Date.now();
        if (nowId - lastId < 60 * 1000) return;
        __recentMessages.set(keyId, nowId);
      }
    } catch {}

    // TEMPORÁRIO: Comentado para teste
    // if (!last || last.status !== 'published') {
    //   console.log('[Adapter] Bot desligado (status != published). Ignorando mensagem.');
    //   return;
    // }
    console.log(
      '[Adapter] Status do bot:',
      last?.status || 'não encontrado',
      '- Processando mensagem...'
    );

    // Anti-duplicação logo no início do processamento textual
    try {
      const nowTs = Date.now();
      const key = `${from}::${text}`;
      const last = __recentMessages.get(key) || 0;
      if (nowTs - last < 10000) {
        // Aumentado para 10 segundos
        console.warn('[Adapter] (text) Ignorando duplicata recente de', from, 'texto:', text);
        return;
      }
      __recentMessages.set(key, nowTs);
      // Limpeza simples
      if (__recentMessages.size > 5000) {
        for (const [k, v] of __recentMessages) {
          if (nowTs - v > 5 * 60 * 1000) __recentMessages.delete(k);
        }
      }
    } catch {}


    // Carregar/abrir sessão e registrar inbound
    const session = await getOrCreateSession('whatsapp', from);
    await logMessage(session.id, 'in', text);
    try {
      const { logEvent } = await import('./analytics.js');
      await logEvent({ type: 'msg:in', session_id: session.id, from, channel: 'whatsapp', data: { text } });
    // Marcar início de inbound (texto) para lock de resposta única
    try { __markInbound(session.id, meta as any); } catch {}

    } catch {}

    // Atualizar timestamp de última entrada
    try {
      const nowIso = new Date().toISOString();
      const st0 = { ...(session?.state || {}), last_in_at: nowIso, last_raw_message: text } as any;
      await (await import('./sessionStore.js')).setSessionState(session.id, st0);
    } catch {}
    // Detectar reset explícito de contexto ("novo atendimento", etc.) antes de qualquer reengajamento/IA
    const norm = text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase();
    if (looksLikeContextSwitch(norm)) {
      try {
        // Limpa completamente o estado da sessão
        const { setSessionState } = await import('./sessionStore.js');
        await setSessionState(session.id, {} as any);
      } catch {}
      const msg = 'Fechado, começamos do zero. Qual é o equipamento e qual o problema?';
      await sendTextOnce(session.id, from, msg, meta as any);
      try {
        const { logEvent } = await import('./analytics.js');
        await logEvent({ type: 'session:reset', session_id: session.id, from, channel: 'whatsapp', data: { reason: 'explicit_user_reset' } });
      } catch {}
      return;
    }

    // Saudações curtas: se reengajamento está desligado, não chamar IA; pedir dados básicos
    const isGreetingOnly = /^(ola|oi|opa|e ai|tudo bem|bom dia|boa tarde|boa noite)[.!? ]*$/.test(norm);
    if (isGreetingOnly && !REENGAGE_ENABLED) {
      const msg = 'Oi! Para te ajudar rapidinho, me diga: qual é o equipamento e qual o problema?';
      await sendTextOnce(session.id, from, msg, meta as any);
      try {
        const { setSessionState } = await import('./sessionStore.js');
        await setSessionState(session.id, { ...(session?.state || {}), last_out_at: new Date().toISOString(), greeted: true, asked_basic_info: true });
      } catch {}
      return;
    }


    // Re-greeting humanizado se for retorno após ausência
    // Se usuário sinalizou troca de contexto, nunca reengajar
    if (looksLikeContextSwitch(norm)) {
      // Não envia reengajamento – segue para coleta natural
    } else
    if (REENGAGE_ENABLED) try {
      const norm = text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase();
      const isGreetingOnly = /^(ola|oi|bom dia|boa tarde|boa noite|opa|e ai|tudo bem)[.!? ]*$/.test(
        norm
      );
      const st = (session?.state || {}) as any;
      const lastIn = st.last_in_at ? new Date(st.last_in_at) : null;
      const lastOut = st.last_out_at ? new Date(st.last_out_at) : null;
      const lastTs = lastIn || lastOut;
      const now = new Date();
      const gapMin = lastTs ? Math.floor((now.getTime() - lastTs.getTime()) / 60000) : null;
      const cooldownOk =
        !st.reengaged_at || now.getTime() - new Date(st.reengaged_at).getTime() > 2 * 60 * 1000;

      if (isGreetingOnly && gapMin !== null && gapMin > 60 && cooldownOk) {
        const hasContext = !!(
          st?.dados_coletados &&
          (st.dados_coletados.equipamento || st.dados_coletados.problema)
        );
        let msg = '';
        if (gapMin >= 24 * 60) {
          msg = hasContext
            ? `Olá de novo! Da última vez falamos sobre seu ${st.dados_coletados.equipamento || ''}${st.dados_coletados.problema ? ' (' + st.dados_coletados.problema + ')' : ''}. Quer continuar de onde paramos ou começar um novo atendimento?`
            : 'Olá de novo! Quer retomar de onde paramos ou começar um novo atendimento?';
        } else {
          msg = hasContext
            ? `Que bom te ver por aqui de novo. Retomamos do seu ${st.dados_coletados.equipamento || 'atendimento anterior'}${st.dados_coletados.problema ? ' (' + st.dados_coletados.problema + ')' : ''}?`
            : 'Que bom te ver por aqui de novo. Quer continuar de onde paramos?';
        }
        await sendTextOnce(session.id, from, msg, meta as any);
        await (
          await import('./sessionStore.js')
        ).setSessionState(session.id, {
          ...(st || {}),
          reengaged_at: now.toISOString(),
          last_out_at: now.toISOString(),
        });
        return;
      }
    } catch {}

    // Já carregamos a sessão e registramos o inbound acima
    // Enviar saudação curta uma única vez por conversa (mais natural)
    // Desabilita saudação automática em ambiente de teste para não interferir nos asserts
    if (GREETING_ENABLED && process.env.NODE_ENV !== 'test') try {
      // Não enviar saudação automática em modo de teste interno
      let skipGreeting = false;
      try {
        const { isTestModeEnabled } = await import('./testMode.js');
        skipGreeting = !!(isTestModeEnabled && isTestModeEnabled());
      } catch {}

      if (!skipGreeting) {
        const greeted = !!session?.state?.greeted;
        if (!greeted) {
        // Se houver template 'greeting' configurado, use-o; caso contrário, use fallback curto via Copy
        let greetingText = '';
        try {
          const { getTemplates, renderTemplate } = await import('./botConfig.js');
          const templates = await getTemplates();
          const greeting = templates.find((t: any) => t.key === 'greeting');
          if (greeting?.content) greetingText = renderTemplate(greeting.content, {});
        } catch {}
        if (!greetingText) {
          const { getCopy } = await import('./copy.js');
          greetingText = getCopy('greetingFallback');
        }
        await sendTextOnce(session.id, from, greetingText, meta as any);
        try {
          const { logEvent } = await import('./analytics.js');
          await logEvent({ type: 'msg:out', session_id: session.id, from, channel: 'whatsapp', data: { greetingText } });
        } catch {}
        const { setSessionState } = await import('./sessionStore.js');
        await setSessionState(session.id, {
          ...(session.state || {}),
          greeted: true,
          last_out_at: new Date().toISOString(),
        });
        // Se a mensagem do cliente for apenas uma saudação, não prossiga para evitar duas mensagens em sequência
        const norm = text
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .trim()
          .toLowerCase();
        const isJustGreeting = /^(ola|oi|bom dia|boa tarde|boa noite)[.!? ]*$/.test(norm);
        if (isJustGreeting) return;
      }
    }
    } catch {}

    // Test mode: só processa mensagens do número whitelisted
    try {
      const { isTestModeEnabled, isPeerAllowedForTestMode } = await import('./testMode.js');
      if (isTestModeEnabled() && !isPeerAllowedForTestMode(from)) {
        console.log('[Adapter] Test mode ativo. Ignorando mensagem de', from);
        return;
      }
    } catch {}

    // Pausa global
    if (isGloballyPaused()) {
      console.log('[Adapter] Bot pausado globalmente. Ignorando mensagem.');
      return;
    }
    // Pausa por conversa
    if (session?.state?.paused) {
      console.log('[Adapter] Bot pausado nesta conversa. Ignorando mensagem.');
      return;
    }
    // Short-circuit: pedidos de STATUS antes de acionar LLM/orquestrador
    try {
      const lowered0 = text.toLowerCase();
      const wantsStatus0 = /\b(status|andamento|atualiza[cç][aã]o|novidade|not[ií]cia|previs[aã]o|quando.*(t[eé]cnico|coleta|entrega)|chegou.*pe[çc]a|os\s*#?\d+)\b/i.test(lowered0);
      if (wantsStatus0) {
        await processStatus(asWebhookBody(from, text));
        return;
      }
    } catch {}

    // Despedidas/adiamento: resposta empática e encerra sem empurrar fluxo
    try {
      const norm2 = text
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .trim()
        .toLowerCase();
      const byeOrDefer = /\b(tchau|ate mais|ate logo|obrigado|obrigada|valeu|depois falo|depois eu falo|depois retorno|qualquer coisa.*(volto|falo).*(contigo|com voce)|estou levantando outros valores|estou cotando|pegando outros orcamentos|vou ver (aqui )?e retorno)\b/.test(norm2);
      if (byeOrDefer) {
        const msg = 'Perfeito, sem problema! Fico à disposição. Quando quiser retomar, é só mandar mensagem por aqui. Abraço!';
        await waClient.sendText(from, msg);
        await logMessage(session.id, 'out', msg);
        try {
          const { setSessionState } = await import('./sessionStore.js');
          const st = (session?.state || {}) as any;
          await setSessionState(session.id, { ...st, soft_closed_at: new Date().toISOString() });
        } catch {}
        return;
      }
    } catch {}


    const llmFirst = (process.env.LLM_FIRST ?? 'true').toLowerCase() !== 'false';

    if (llmFirst) {
      // LLM primeiro para respostas mais naturais
      console.log('[Adapter] Tentando LLM primeiro para', from);
      try {
        // Expor estado corrente para sanitizer evitar inventar marca em respostas naturais
        try {
          (global as any).current_session_state_for_sanitizer = (session as any)?.state || null;
        } catch {}
        let reply = await orchestrateInbound(from, text, session);

        // Se o orquestrador não respondeu (cooldown) e já temos dados visuais, aplicar gate de marca+problema
        if (!reply) {
          const st = (session as any)?.state || {};
          const hasMount = !!st.visual_type;
          const hasBurners = !!st.visual_burners;
          if (hasMount && hasBurners) {
            const collected = (st?.dados_coletados || {}) as any;
            const hasBrand = !!collected.marca;
            const problemText = String(collected.problema || collected.description || '').trim();
            const hasProblem = !!problemText;

            if (!hasBrand || !hasProblem) {
              if (!hasBrand && !hasProblem) {
                reply = 'Antes do orçamento: qual é a marca do fogão e qual é o problema específico?';
              } else if (!hasBrand) {
                reply = 'Qual é a marca do fogão?';
              } else {
                reply = 'Qual é o problema específico que está acontecendo?';
              }
            } else {
              const { buildQuote } = await import('./toolsRuntime.js');
              const mount = st.visual_type === 'floor' ? 'piso' : 'cooktop';
              const quote = await buildQuote({
                service_type: 'domicilio',
                equipment: 'fogão',
                power_type: 'gás',
                mount,
                num_burners: st.visual_burners,
                brand: collected.marca,
                problem: problemText,
              } as any);
              if (quote) {
                reply = `Orçamento estimado: R$ ${quote?.value ?? quote?.min ?? '—'} (faixa R$ ${quote?.min ?? '—'} a R$ ${quote?.max ?? '—'}). Podemos prosseguir com o agendamento?`;
              }
            }
          }
        }

        // Se a resposta do orquestrador vier no formato { text, options }, enviar botões
        try {
          if (
            reply &&
            typeof reply === 'object' &&
            (reply as any).text &&
            Array.isArray((reply as any).options)
          ) {
            const r: any = reply;
            const options = (r.options as Array<{ id?: string; text: string }>).map((o, i) => ({
              id: o.id || String(i + 1),
              text: o.text,
            }));
            await sendButtonsOnce(session.id, from, r.text, options, meta as any);
            return;
          }
        } catch {}

        const preview =
          typeof reply === 'string' ? reply.slice(0, 100) : JSON.stringify(reply).slice(0, 100);
        console.log('[Adapter] LLM respondeu:', preview);
        if (reply) {
          if (typeof reply === 'string') {
            await sendTextOnce(session.id, from, reply, meta as any);
            try {
              const { logEvent } = await import('./analytics.js');
              await logEvent({ type: 'msg:out', session_id: session.id, from, channel: 'whatsapp', data: { reply } });
            } catch {}
          } else if ((reply as any).text && Array.isArray((reply as any).options)) {
            const r: any = reply;
            const options = (r.options as Array<{ id?: string; text: string }>).map((o, i) => ({
              id: o.id || String(i + 1),
              text: o.text,
            }));
            await sendButtonsOnce(session.id, from, r.text, options, meta as any);
          } else {
            const text = JSON.stringify(reply);
            await sendTextOnce(session.id, from, text, meta as any);
          }
          console.log('[Adapter] Resposta enviada via LLM');
          return;
        }
      } catch (e) {
        console.error('[Adapter] orchestrator error', e);
      }
    } else {
      // Flows primeiro (modo legado)
      console.log('[Adapter] Tentando flows primeiro para', from);
      const handled = await tryHandleByFlows(from, text);
      if (handled) return;
    }

    if (looksLikeConfirmation(text)) {
      try {
        const st = (session?.state || {}) as any;
        const dados = (st?.dados_coletados || {}) as any;
        const hasBrand = !!dados.marca;
        const problemText = String(dados.problema || dados.description || '').trim();
        const hasProblem = !!problemText;
        const equipment = dados.equipamento || st?.equipamento || '';
        if (hasBrand && hasProblem && equipment) {
          // Inicia agendamento automaticamente
          try {
            const { aiScheduleStart } = await import('./toolsRuntime.js');
            await aiScheduleStart({ from, session, prefer_fast_path: true } as any);
          } catch {}
          await sendTextOnce(session.id, from, 'Perfeito! Vou iniciar seu agendamento aqui. Se precisar, te peço só o que faltar.', meta as any);
          await logMessage(session.id, 'out', 'Agendamento iniciado automaticamente por confirmação.');
          return;
        }
      } catch {}
      await sendTextOnce(session.id, from, 'Confirmação recebida.', meta as any);
      return;
    }

    const lowered = text.toLowerCase();
    const wantsStatus = /\b(status|andamento|atualiza[cç][aã]o|novidade|not[ií]cia|previs[aã]o|quando.*(t[eé]cnico|coleta|entrega)|chegou.*pe[çc]a|os\s*#?\d+)\b/i.test(lowered);
    if (wantsStatus) {
      await processStatus(asWebhookBody(from, text));
      return;
    }
    if (lowered.includes('garantia')) {
      await processGarantia(asWebhookBody(from, text));
      return;
    }
    if (lowered.includes('feedback')) {
      await processFeedback(asWebhookBody(from, text));
      return;
    }

    // Flows/FAQ como fallback (templates/config)
    const handled = await tryHandleByFlows(from, text);
    if (handled) return;

    console.log('[Adapter] FAQ fallback para', from);
    await processFAQ(asWebhookBody(from, text));
  });

  console.log('[Adapter] 🔧 Setup do adapter concluído! Handlers registrados.');
}
